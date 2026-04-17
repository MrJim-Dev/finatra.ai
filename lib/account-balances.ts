import type { SupabaseClient } from "@supabase/supabase-js";

type BalanceRow = { account_id: string; balance: number | string | null };

/**
 * Ledger balance from `public.transactions` (income / expense / transfer legs),
 * matching `get_account_balance` / `user_accounts_grouped_view` semantics.
 */
export async function fetchAccountBalanceMap(
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("get_account_balances");
  if (error || !Array.isArray(data)) {
    return new Map();
  }
  const map = new Map<string, number>();
  for (const row of data as BalanceRow[]) {
    if (!row?.account_id) continue;
    const n = Number(row.balance);
    map.set(row.account_id, Number.isFinite(n) ? n : 0);
  }
  return map;
}

/** Merge RPC balances into account rows for API responses (`amount` = ledger balance). */
export function applyBalanceMap<
  T extends { account_id: string; amount?: number | null },
>(accounts: T[], balances: Map<string, number>): T[] {
  return accounts.map((a) => {
    if (!balances.has(a.account_id)) return { ...a };
    return { ...a, amount: balances.get(a.account_id)! };
  });
}
