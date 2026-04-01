import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  applyMmbakExtensionPayload,
  insertTransactionTagLinksForChunk,
} from '@/lib/import/commit-mmbak-extension';
import type { MmbakExtensionPayload } from '@/lib/import/mmbak-extension';

const commitRowSchema = z.object({
  transaction_id: z.string().uuid().optional(),
  transaction_date: z.string().min(1),
  account_id: z.string().uuid(),
  category: z.string().min(1),
  amount: z.number().finite().positive(),
  transaction_type: z.enum(['income', 'expense', 'transfer']),
  note: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  to_account_id: z.string().uuid().nullable().optional(),
  currency: z.string().max(16).optional().nullable(),
  category_mm_uid: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  amount_in_account_currency: z.number().nullable().optional(),
  mm_meta: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  port_id: z.string().uuid(),
  rows: z.array(commitRowSchema).min(1).max(8000),
  mmbak_extension: z.any().optional(),
  transaction_tag_links: z
    .array(
      z.object({
        transaction_id: z.string().uuid(),
        tag_mm_uid: z.string().min(1),
      })
    )
    .optional(),
});

const INSERT_CHUNK = 800;
const ACCOUNT_IN_CHUNK = 200;

type AccountRow = {
  user_id: string;
  port_id: string;
  currency?: string | null;
};

async function loadAccountsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, AccountRow> | { error: string }> {
  const unique = Array.from(new Set(ids));
  const map = new Map<string, AccountRow>();

  for (let i = 0; i < unique.length; i += ACCOUNT_IN_CHUNK) {
    const slice = unique.slice(i, i + ACCOUNT_IN_CHUNK);
    const { data, error } = await supabase
      .from('accounts')
      .select('account_id, user_id, port_id, currency')
      .in('account_id', slice);

    if (error) {
      return { error: `Account lookup failed: ${error.message}` };
    }
    for (const r of data ?? []) {
      if (r.account_id && r.user_id && r.port_id) {
        map.set(r.account_id, {
          user_id: r.user_id,
          port_id: r.port_id,
          currency: r.currency,
        });
      }
    }
  }

  const missing = unique.filter((id) => !map.has(id));
  if (missing.length > 0) {
    const sample = missing.slice(0, 5).join(', ');
    return {
      error: `Unknown account_id(s): ${sample}${missing.length > 5 ? ' …' : ''}`,
    };
  }

  return map;
}

async function loadCategoryMmMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  portId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('categories')
    .select('id, mm_uid')
    .eq('port_id', portId)
    .not('mm_uid', 'is', null);
  const m = new Map<string, number>();
  for (const r of data ?? []) {
    const u = (r.mm_uid as string | null)?.trim();
    if (u) m.set(u, r.id as number);
  }
  return m;
}

async function loadTagMmMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  portId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('tags')
    .select('tag_id, mm_uid')
    .eq('port_id', portId)
    .not('mm_uid', 'is', null);
  const m = new Map<string, string>();
  for (const r of data ?? []) {
    const u = (r.mm_uid as string | null)?.trim();
    if (u) m.set(u, r.tag_id as string);
  }
  return m;
}

function cleanMeta(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
  }
  return {};
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
    const top = parsed.error.issues
      .slice(0, 6)
      .map(
        (i) =>
          `${i.path.join('.') || 'body'}: ${i.message}${i.code === 'invalid_type' && 'received' in i ? ` (got ${String((i as { received?: string }).received)})` : ''}`
      )
      .join(' · ');
    return NextResponse.json(
      {
        error: `Invalid import payload — ${top}`,
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { rows, port_id, mmbak_extension, transaction_tag_links } = parsed.data;

  const { data: portfolio, error: portErr } = await supabase
    .from('portfolio')
    .select('user_id')
    .eq('port_id', port_id)
    .maybeSingle();

  if (portErr || !portfolio || portfolio.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Portfolio not found or access denied.' },
      { status: 403 }
    );
  }

  if (mmbak_extension && typeof mmbak_extension === 'object') {
    const ext = mmbak_extension as MmbakExtensionPayload;
    const applied = await applyMmbakExtensionPayload(
      supabase,
      user.id,
      port_id,
      ext
    );
    if (applied.error) {
      return NextResponse.json({ error: applied.error }, { status: 400 });
    }
  }

  const categoryMmMap = await loadCategoryMmMap(supabase, port_id);
  const tagMmMap = await loadTagMmMap(supabase, port_id);

  const { data: portCurRow } = await supabase
    .from('portfolio')
    .select('default_currency')
    .eq('port_id', port_id)
    .maybeSingle();
  const portfolioDefaultCurrency =
    portCurRow?.default_currency?.trim() || null;

  const accountIds: string[] = [];
  for (const row of rows) {
    if (row.transaction_type === 'transfer' && !row.to_account_id) {
      return NextResponse.json(
        {
          error: `Transfer rows require to_account_id (account ${row.account_id}, date ${row.transaction_date}).`,
        },
        { status: 400 }
      );
    }
    accountIds.push(row.account_id);
    if (row.transaction_type === 'transfer' && row.to_account_id) {
      accountIds.push(row.to_account_id);
    }
  }

  const accMap = await loadAccountsMap(supabase, accountIds);
  if ('error' in accMap) {
    return NextResponse.json({ error: accMap.error }, { status: 400 });
  }

  for (const id of Array.from(new Set(accountIds))) {
    const acc = accMap.get(id)!;
    if (acc.user_id !== user.id || acc.port_id !== port_id) {
      return NextResponse.json(
        {
          error:
            'One or more accounts are not in this portfolio or do not belong to you.',
        },
        { status: 403 }
      );
    }
  }

  type ResolvedTx = {
    transaction_id: string;
    account_id: string;
    transaction_date: string;
    note: string | null;
    description: string | null;
    category: string;
    category_id: number | null;
    amount: number;
    transaction_type: string;
    to_account_id: string | null;
    uid: string;
    port_id: string;
    currency: string | null;
    deleted_at: string | null;
    amount_in_account_currency: number | null;
    mm_meta: Record<string, unknown>;
  };

  const resolved: ResolvedTx[] = [];

  for (const row of rows) {
    const date = row.transaction_date.includes('T')
      ? row.transaction_date
      : `${row.transaction_date}T12:00:00.000Z`;

    const note = row.note?.trim() || null;
    const desc = row.description?.trim() || null;

    const acc = accMap.get(row.account_id)!;
    const resolvedCurrency =
      row.currency?.trim() ||
      acc.currency?.trim() ||
      portfolioDefaultCurrency ||
      null;

    const cm = row.category_mm_uid?.trim();
    const category_id =
      cm && categoryMmMap.has(cm) ? categoryMmMap.get(cm)! : null;

    const del = row.deleted_at?.trim()
      ? row.deleted_at.includes('T')
        ? row.deleted_at
        : `${row.deleted_at.slice(0, 10)}T12:00:00.000Z`
      : null;

    const aac = row.amount_in_account_currency;
    const amount_in_account_currency =
      typeof aac === 'number' && Number.isFinite(aac) ? aac : null;

    resolved.push({
      transaction_id: row.transaction_id ?? randomUUID(),
      account_id: row.account_id,
      transaction_date: date,
      note: note && note.length > 100 ? note.slice(0, 100) : note,
      description:
        desc && desc.length > 500 ? desc.slice(0, 500) : desc,
      category: row.category.trim(),
      category_id,
      amount: row.amount,
      transaction_type: row.transaction_type,
      to_account_id:
        row.transaction_type === 'transfer' ? row.to_account_id! : null,
      uid: user.id,
      port_id,
      currency: resolvedCurrency,
      deleted_at: del,
      amount_in_account_currency,
      mm_meta: cleanMeta(row.mm_meta),
    });
  }

  let inserted = 0;
  const errors: string[] = [];
  let insertBatches = 0;

  for (let i = 0; i < resolved.length; i += INSERT_CHUNK) {
    const chunk = resolved.slice(i, i + INSERT_CHUNK);
    insertBatches += 1;
    const { error } = await supabase.from('transactions').insert(chunk);

    if (error) {
      errors.push(`Insert batch ${insertBatches}: ${error.message}`);
      break;
    }
    inserted += chunk.length;
  }

  let tagLinksInserted = 0;
  if (
    transaction_tag_links &&
    transaction_tag_links.length > 0 &&
    inserted > 0
  ) {
    const tagRes = await insertTransactionTagLinksForChunk(
      supabase,
      port_id,
      transaction_tag_links,
      tagMmMap
    );
    if (tagRes.error) {
      errors.push(`transaction_tags: ${tagRes.error}`);
    }
    tagLinksInserted = tagRes.inserted;
  }

  if (errors.length > 0 && inserted === 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 500 });
  }

  return NextResponse.json({
    inserted,
    requested: rows.length,
    uniqueAccountsResolved: new Set(accountIds).size,
    insertBatches,
    transaction_tag_links_inserted: tagLinksInserted,
    warnings: errors.length ? errors : undefined,
  });
}
