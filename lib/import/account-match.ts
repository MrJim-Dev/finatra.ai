export type AccountOption = {
  account_id: string;
  name: string;
  port_id: string;
  user_id: string;
  amount?: number | null;
  group_id?: string | null;
  description?: string | null;
  created_at?: string | null;
  /** ISO-style currency code; null uses portfolio default */
  currency?: string | null;
  /** Include in dashboard totals (matches `user_accounts_grouped_view`) */
  in_total?: boolean | null;
  hidden?: boolean | null;
};

export type AccountGroupRow = {
  group_id: string;
  group_name: string | null;
  port_id: string | null;
  group_type?: string | null;
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Best-effort match of spreadsheet account label to a DB account. */
export function matchAccount(
  label: string,
  accounts: AccountOption[]
): AccountOption | null {
  const n = norm(label);
  if (!n) return null;

  const exact = accounts.find((a) => norm(a.name) === n);
  if (exact) return exact;

  const includes = accounts.find(
    (a) => n.includes(norm(a.name)) || norm(a.name).includes(n)
  );
  if (includes) return includes;

  const noSpace = n.replace(/\s/g, '');
  return (
    accounts.find((a) => norm(a.name).replace(/\s/g, '') === noSpace) ?? null
  );
}
