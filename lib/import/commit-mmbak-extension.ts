import type { SupabaseClient } from '@supabase/supabase-js';
import type { MmbakExtensionPayload } from '@/lib/import/mmbak-extension';
import { mmCategoryZdoToFinatraType } from '@/lib/import/mmbak-category-meta';

/** Insert MM category tree; returns mm_uid (ZUID) → categories.id */
export async function upsertMmbakCategories(
  supabase: SupabaseClient,
  portId: string,
  categories: MmbakExtensionPayload['categories']
): Promise<{ map: Map<string, number>; error?: string }> {
  const map = new Map<string, number>();
  if (categories.length === 0) return { map };

  const valid = categories.filter((c) => (c.zuid ?? '').trim());
  const byUid = new Map<string, (typeof valid)[0]>();
  for (const c of valid) {
    byUid.set((c.zuid ?? '').trim(), c);
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('id, mm_uid')
    .eq('port_id', portId)
    .not('mm_uid', 'is', null);

  for (const r of existing ?? []) {
    const u = (r.mm_uid as string | null)?.trim();
    if (u) map.set(u, r.id as number);
  }

  let remaining = [...valid];
  let guard = 0;
  while (remaining.length > 0 && guard < valid.length + 5) {
    guard += 1;
    const next: typeof remaining = [];
    let progress = false;
    for (const c of remaining) {
      const uid = (c.zuid ?? '').trim();
      if (map.has(uid)) {
        progress = true;
        continue;
      }
      const puid = (c.zpuid ?? '').trim();
      const parentNeeded =
        puid &&
        puid !== '0' &&
        byUid.has(puid) &&
        !map.has(puid);
      if (parentNeeded) {
        next.push(c);
        continue;
      }
      const parentId =
        puid && puid !== '0' && map.has(puid) ? map.get(puid)! : null;
      const name = (c.zname ?? '').trim() || 'Unnamed';
      const type = mmCategoryZdoToFinatraType(c.zdo_type);

      const { data: ins, error } = await supabase
        .from('categories')
        .insert({
          name,
          port_id: portId,
          parent_id: parentId,
          type,
          mm_uid: uid,
        })
        .select('id')
        .single();

      if (error) {
        const { data: row } = await supabase
          .from('categories')
          .select('id')
          .eq('port_id', portId)
          .eq('mm_uid', uid)
          .maybeSingle();
        if (row?.id) {
          map.set(uid, row.id as number);
          progress = true;
          continue;
        }
        return { map, error: `categories: ${error.message}` };
      }
      map.set(uid, ins!.id as number);
      progress = true;
    }
    remaining = next;
    if (!progress) break;
  }

  return { map };
}

export async function upsertMmbakTags(
  supabase: SupabaseClient,
  userId: string,
  portId: string,
  tags: MmbakExtensionPayload['tags']
): Promise<{ map: Map<string, string>; error?: string }> {
  const map = new Map<string, string>();
  for (const t of tags) {
    const mmUid = (t.zuid ?? '').trim();
    const name = (t.zname ?? '').trim() || 'Tag';
    if (!mmUid) continue;

    const { data: existing } = await supabase
      .from('tags')
      .select('tag_id')
      .eq('port_id', portId)
      .eq('mm_uid', mmUid)
      .maybeSingle();
    if (existing?.tag_id) {
      map.set(mmUid, existing.tag_id as string);
      continue;
    }

    const { data: ins, error } = await supabase
      .from('tags')
      .insert({
        port_id: portId,
        user_id: userId,
        name,
        mm_uid: mmUid,
      })
      .select('tag_id')
      .single();

    if (error) {
      const { data: byName } = await supabase
        .from('tags')
        .select('tag_id, mm_uid')
        .eq('port_id', portId)
        .eq('name', name)
        .maybeSingle();
      if (byName?.tag_id) {
        map.set(mmUid, byName.tag_id as string);
        if (!byName.mm_uid) {
          await supabase
            .from('tags')
            .update({ mm_uid: mmUid })
            .eq('tag_id', byName.tag_id);
        }
        continue;
      }
      return { map, error: `tags: ${error.message}` };
    }
    map.set(mmUid, ins!.tag_id as string);
  }
  return { map };
}

export async function insertMmbakBudgetsAndLines(
  supabase: SupabaseClient,
  userId: string,
  portId: string,
  budgets: MmbakExtensionPayload['budgets'],
  budgetAmounts: MmbakExtensionPayload['budgetAmounts']
): Promise<{ error?: string }> {
  const zPkToBudgetUuid = new Map<number, string>();

  for (const b of budgets) {
    const mmUid = (b.zuid ?? '').trim() || `pk:${b.z_pk}`;
    const { data: existing } = await supabase
      .from('budgets')
      .select('budget_id')
      .eq('port_id', portId)
      .eq('mm_uid', mmUid)
      .maybeSingle();
    if (existing?.budget_id) {
      zPkToBudgetUuid.set(b.z_pk, existing.budget_id as string);
      continue;
    }
    const { data: ins, error } = await supabase
      .from('budgets')
      .insert({
        port_id: portId,
        user_id: userId,
        mm_uid: mmUid,
        label: b.zdaystr,
        period_type: b.zperiodtypeint,
        trans_type: b.ztranstypeint,
        total_type: b.ztotaltypeint,
        day_str: b.zdaystr,
        raw: b.raw,
      })
      .select('budget_id')
      .single();
    if (error) return { error: `budgets: ${error.message}` };
    zPkToBudgetUuid.set(b.z_pk, ins!.budget_id as string);
  }

  for (const line of budgetAmounts) {
    const raw = line.raw;
    const zBudgetPk = Number(raw.ZBUDGETID);
    const budgetId = Number.isFinite(zBudgetPk)
      ? zPkToBudgetUuid.get(zBudgetPk)
      : undefined;
    if (!budgetId) continue;
    const amt = raw.ZAMOUNT;
    const amount =
      typeof amt === 'number' && Number.isFinite(amt) ? amt : null;
    const { error } = await supabase.from('budget_amount_lines').insert({
      budget_id: budgetId,
      target_uid:
        (raw.ZBUDGETUID as string) ?? (raw.ZUID as string) ?? null,
      money_str: (raw.ZMONEYSTR as string) ?? null,
      amount,
      raw,
    });
    if (error) return { error: `budget_amount_lines: ${error.message}` };
  }
  return {};
}

export async function insertMmbakTemplates(
  supabase: SupabaseClient,
  userId: string,
  portId: string,
  recurring: Record<string, unknown>[],
  favorites: Record<string, unknown>[]
): Promise<{ error?: string }> {
  for (const r of recurring) {
    const zuid = String(r.ZUID ?? '').trim();
    const mmUid = zuid || `pk:${r.Z_PK}`;
    const { error } = await supabase.from('recurring_templates').insert({
      port_id: portId,
      user_id: userId,
      mm_uid: mmUid,
      payload: r,
    });
    if (
      error &&
      !error.message.includes('duplicate') &&
      error.code !== '23505'
    ) {
      return { error: `recurring_templates: ${error.message}` };
    }
  }
  for (const r of favorites) {
    const zuid = String(r.ZUID ?? '').trim();
    const mmUid = zuid || `pk:${r.Z_PK}`;
    const { error } = await supabase.from('favorite_templates').insert({
      port_id: portId,
      user_id: userId,
      mm_uid: mmUid,
      payload: r,
    });
    if (
      error &&
      !error.message.includes('duplicate') &&
      !error.code?.includes('23')
    ) {
      return { error: `favorite_templates: ${error.message}` };
    }
  }
  return {};
}

export async function upsertPortfolioKv(
  supabase: SupabaseClient,
  userId: string,
  portId: string,
  entries: MmbakExtensionPayload['portfolioKv']
): Promise<{ error?: string }> {
  for (const e of entries) {
    const { error } = await supabase.from('portfolio_kv').upsert(
      {
        port_id: portId,
        user_id: userId,
        source: e.source,
        key: e.key,
        value: e.value as object,
      },
      { onConflict: 'port_id,source,key' }
    );
    if (error) return { error: `portfolio_kv: ${error.message}` };
  }
  return {};
}

export async function insertTransactionTagLinksForChunk(
  supabase: SupabaseClient,
  portId: string,
  links: { transaction_id: string; tag_mm_uid: string }[],
  tagMap: Map<string, string>
): Promise<{ inserted: number; error?: string }> {
  let inserted = 0;
  for (const l of links) {
    const tagId = tagMap.get(l.tag_mm_uid.trim());
    if (!tagId) continue;
    const { data: tx } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('transaction_id', l.transaction_id)
      .eq('port_id', portId)
      .maybeSingle();
    if (!tx) continue;
    const { error } = await supabase.from('transaction_tags').insert({
      transaction_id: l.transaction_id,
      tag_id: tagId,
    });
    if (error) {
      if (!error.message.includes('duplicate')) {
        return { inserted, error: error.message };
      }
    } else {
      inserted += 1;
    }
  }
  return { inserted };
}

export async function applyMmbakExtensionPayload(
  supabase: SupabaseClient,
  userId: string,
  portId: string,
  payload: MmbakExtensionPayload
): Promise<{
  categoryMmUidToId: Map<string, number>;
  tagMmUidToId: Map<string, string>;
  error?: string;
}> {
  const cat = await upsertMmbakCategories(supabase, portId, payload.categories);
  if (cat.error) {
    return {
      categoryMmUidToId: new Map(),
      tagMmUidToId: new Map(),
      error: cat.error,
    };
  }

  const tag = await upsertMmbakTags(supabase, userId, portId, payload.tags);
  if (tag.error) {
    return {
      categoryMmUidToId: cat.map,
      tagMmUidToId: new Map(),
      error: tag.error,
    };
  }

  const bud = await insertMmbakBudgetsAndLines(
    supabase,
    userId,
    portId,
    payload.budgets,
    payload.budgetAmounts
  );
  if (bud.error) {
    return {
      categoryMmUidToId: cat.map,
      tagMmUidToId: tag.map,
      error: bud.error,
    };
  }

  const tpl = await insertMmbakTemplates(
    supabase,
    userId,
    portId,
    payload.recurringTemplates,
    payload.favoriteTemplates
  );
  if (tpl.error) {
    return {
      categoryMmUidToId: cat.map,
      tagMmUidToId: tag.map,
      error: tpl.error,
    };
  }

  const kvEntries = [...payload.portfolioKv];
  payload.standaloneMemos.forEach((m, i) => {
    const pk = m.Z_PK ?? i;
    kvEntries.push({
      source: 'mm_memo',
      key: `memo_${pk}`,
      value: m,
    });
  });

  const kv = await upsertPortfolioKv(
    supabase,
    userId,
    portId,
    kvEntries
  );
  if (kv.error) {
    return {
      categoryMmUidToId: cat.map,
      tagMmUidToId: tag.map,
      error: kv.error,
    };
  }

  return { categoryMmUidToId: cat.map, tagMmUidToId: tag.map };
}
