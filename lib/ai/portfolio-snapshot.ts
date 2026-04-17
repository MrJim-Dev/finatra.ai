import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountLite = { account_id: string; name: string; group_name?: string };
export type CategoryLite = { name: string; type: "income" | "expense" };

export type PortfolioSnapshot = {
  port_id: string;
  user_id: string;
  accounts: AccountLite[];
  categories: CategoryLite[];
};

export async function loadPortfolioSnapshot(
  supabase: SupabaseClient,
  port_id: string,
  user_id: string
): Promise<PortfolioSnapshot> {
  const [accRes, grpRes, catRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("account_id, name, group_id")
      .eq("port_id", port_id)
      .order("name", { ascending: true }),
    supabase
      .from("account_groups")
      .select("group_id, group_name")
      .eq("port_id", port_id),
    supabase
      .from("categories")
      .select("name, type")
      .eq("port_id", port_id)
      .order("name", { ascending: true }),
  ]);

  const groupMap = new Map<string, string>();
  for (const g of grpRes.data ?? []) {
    if (g.group_id && g.group_name) groupMap.set(g.group_id, g.group_name);
  }

  const accounts: AccountLite[] = (accRes.data ?? []).map((a) => ({
    account_id: a.account_id as string,
    name: a.name as string,
    group_name: a.group_id ? groupMap.get(a.group_id as string) : undefined,
  }));

  const categories: CategoryLite[] = (catRes.data ?? [])
    .filter((c) => c.type === "income" || c.type === "expense")
    .map((c) => ({ name: c.name as string, type: c.type as "income" | "expense" }));

  return { port_id, user_id, accounts, categories };
}

export function snapshotToPromptContext(snap: PortfolioSnapshot): string {
  const accLines = snap.accounts.map(
    (a) =>
      `- ${a.name}${a.group_name ? ` (${a.group_name})` : ""} [account_id=${a.account_id}]`
  );
  const catIncome = snap.categories.filter((c) => c.type === "income").map((c) => c.name);
  const catExpense = snap.categories.filter((c) => c.type === "expense").map((c) => c.name);
  return [
    "Accounts (pick account_id verbatim from this list):",
    accLines.join("\n") || "  (none)",
    "",
    `Income categories: ${catIncome.join(", ") || "(none)"}`,
    `Expense categories: ${catExpense.join(", ") || "(none)"}`,
  ].join("\n");
}
