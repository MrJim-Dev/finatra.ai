import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { matchAccount, type AccountOption } from '@/lib/import/account-match';
import {
  applyBalanceMap,
  fetchAccountBalanceMap,
} from '@/lib/import/account-balances';

const IMPORT_GROUP_NAME = 'Excel import';

const finatraGroupTypeSchema = z.enum(['default', 'credit', 'debit']);

const accountWithGroupSchema = z.object({
  name: z.string().min(1).max(256),
  groupName: z.string().min(1).max(256),
  mmGroupUid: z.string().optional(),
  groupType: finatraGroupTypeSchema.optional(),
  currency: z.string().max(16).optional().nullable(),
  in_total: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

const bodySchema = z.object({
  port_id: z.string().uuid(),
  names: z.array(z.string()).max(800).optional(),
  accounts: z.array(accountWithGroupSchema).max(500).optional(),
}).refine(
  (b) => {
    const nameCount = (b.names ?? []).filter((n) => n.trim()).length;
    const acctCount = b.accounts?.length ?? 0;
    return nameCount > 0 || acctCount > 0;
  },
  { message: 'Provide non-empty names and/or accounts[]' }
);

async function getOrCreateImportGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: { port_id: string; user_id: string }
): Promise<{ group_id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from('account_groups')
    .select('group_id')
    .eq('port_id', ctx.port_id)
    .eq('group_name', IMPORT_GROUP_NAME)
    .limit(1);

  if (existing?.[0]?.group_id) return { group_id: existing[0].group_id };

  const { data: inserted, error } = await supabase
    .from('account_groups')
    .insert({
      port_id: ctx.port_id,
      user_id: ctx.user_id,
      group_name: IMPORT_GROUP_NAME,
      group_type: 'default',
    })
    .select('group_id')
    .single();

  if (error || !inserted?.group_id) {
    return { error: error?.message ?? 'Could not create import account group' };
  }
  return { group_id: inserted.group_id };
}

async function getOrCreateNamedGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: { port_id: string; user_id: string },
  displayName: string,
  cache: Map<string, string>,
  groupType: z.infer<typeof finatraGroupTypeSchema> = 'default'
): Promise<{ group_id: string; wasNew: boolean } | { error: string }> {
  const trimmed = displayName.trim();
  const nameKey = trimmed.toLowerCase();
  const cacheKey = `${nameKey}::${groupType}`;
  if (cache.has(cacheKey)) return { group_id: cache.get(cacheKey)!, wasNew: false };

  const { data: rows } = await supabase
    .from('account_groups')
    .select('group_id, group_name, group_type')
    .eq('port_id', ctx.port_id);

  const hit = rows?.find(
    (g) =>
      (g.group_name ?? '').trim().toLowerCase() === nameKey &&
      (g.group_type ?? 'default') === groupType
  );
  if (hit?.group_id) {
    cache.set(cacheKey, hit.group_id);
    return { group_id: hit.group_id, wasNew: false };
  }

  const { data: inserted, error } = await supabase
    .from('account_groups')
    .insert({
      port_id: ctx.port_id,
      user_id: ctx.user_id,
      group_name: trimmed,
      group_type: groupType,
    })
    .select('group_id')
    .single();

  if (error || !inserted?.group_id) {
    return { error: error?.message ?? `Could not create group "${trimmed}"` };
  }
  cache.set(cacheKey, inserted.group_id);
  return { group_id: inserted.group_id, wasNew: true };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const portId = parsed.data.port_id;

  const { data: portfolio, error: portErr } = await supabase
    .from('portfolio')
    .select('user_id, port_id, default_currency')
    .eq('port_id', portId)
    .maybeSingle();

  if (portErr || !portfolio || portfolio.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Portfolio not found or access denied.' },
      { status: 403 }
    );
  }

  const ctx = { port_id: portId, user_id: user.id };

  const { data: portAccounts, error: loadErr } = await supabase
    .from('accounts')
    .select(
      'account_id, name, port_id, user_id, amount, group_id, description, created_at, currency, in_total, hidden'
    )
    .eq('port_id', portId)
    .order('name', { ascending: true });

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }

  const working: AccountOption[] = [...(portAccounts ?? [])];
  const created: string[] = [];
  const createdGroups: string[] = [];
  const groupCache = new Map<string, string>();

  const useStructuredAccounts = (parsed.data.accounts?.length ?? 0) > 0;

  if (useStructuredAccounts) {
    const specByName = new Map<string, z.infer<typeof accountWithGroupSchema>>();
    for (const a of parsed.data.accounts!) {
      const nm = a.name.trim();
      if (!specByName.has(nm)) specByName.set(nm, a);
    }

    const namesToAdd = Array.from(specByName.keys()).filter(
      (name) => !matchAccount(name, working)
    );

    for (const name of namesToAdd) {
      if (matchAccount(name, working)) continue;
      const spec = specByName.get(name)!;
      const groupType = spec.groupType ?? 'default';
      const g = await getOrCreateNamedGroup(
        supabase,
        ctx,
        (spec.groupName ?? '').trim() || 'Money Manager',
        groupCache,
        groupType
      );
      if ('error' in g) {
        return NextResponse.json(
          {
            error: g.error,
            created,
            createdGroups,
            accounts: working,
          },
          { status: 500 }
        );
      }
      if (g.wasNew) createdGroups.push(spec.groupName);

      const { data: row, error: insErr } = await supabase
        .from('accounts')
        .insert({
          name,
          user_id: ctx.user_id,
          port_id: ctx.port_id,
          group_id: g.group_id,
          description: 'Imported from Money Manager backup (.mmbak)',
          currency: spec.currency?.trim() || null,
          in_total: spec.in_total !== false,
          hidden: spec.hidden === true,
        })
        .select(
          'account_id, name, port_id, user_id, amount, group_id, description, created_at, currency, in_total, hidden'
        )
        .single();

      if (insErr || !row) {
        return NextResponse.json(
          {
            error: `Failed to create account "${name}": ${insErr?.message ?? 'unknown'}`,
            created,
            createdGroups,
            accounts: working,
          },
          { status: 500 }
        );
      }

      working.push(row);
      created.push(name);
    }

    working.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const rawNames = (parsed.data.names ?? [])
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    const uniqueNames = Array.from(new Set(rawNames));
    const namesToAdd = uniqueNames.filter((name) => !matchAccount(name, working));

    if (namesToAdd.length > 0) {
      const group = await getOrCreateImportGroup(supabase, ctx);
      if ('error' in group) {
        return NextResponse.json({ error: group.error }, { status: 500 });
      }

      const defaultCur = portfolio.default_currency?.trim() || null;

      for (const name of namesToAdd) {
        if (matchAccount(name, working)) continue;

        const { data: row, error: insErr } = await supabase
          .from('accounts')
          .insert({
            name,
            user_id: ctx.user_id,
            port_id: ctx.port_id,
            group_id: group.group_id,
            description: 'Created automatically from Excel import',
            currency: defaultCur || null,
            in_total: true,
            hidden: false,
          })
          .select(
            'account_id, name, port_id, user_id, amount, group_id, description, created_at, currency, in_total, hidden'
          )
          .single();

        if (insErr || !row) {
          return NextResponse.json(
            {
              error: `Failed to create account "${name}": ${insErr?.message ?? 'unknown'}`,
              created,
              accounts: working,
            },
            { status: 500 }
          );
        }

        working.push(row);
        created.push(name);
      }

      working.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const [{ data: fresh, error: freshErr }, { data: groups }, balanceMap] =
    await Promise.all([
      supabase
        .from('accounts')
        .select(
          'account_id, name, port_id, user_id, amount, group_id, description, created_at, currency, in_total, hidden'
        )
        .eq('port_id', portId)
        .order('name', { ascending: true }),
      supabase
        .from('account_groups')
        .select('group_id, group_name, port_id, group_type')
        .eq('port_id', portId)
        .order('group_name', { ascending: true }),
      fetchAccountBalanceMap(supabase),
    ]);

  if (freshErr) {
    return NextResponse.json({ error: freshErr.message }, { status: 500 });
  }

  const accountsOut = applyBalanceMap(fresh ?? working, balanceMap);

  return NextResponse.json({
    created,
    createdGroups:
      useStructuredAccounts && createdGroups.length > 0
        ? Array.from(new Set(createdGroups))
        : undefined,
    accounts: accountsOut,
    groups: groups ?? [],
  });
}
