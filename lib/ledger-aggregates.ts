export type LedgerTx = {
  transaction_id: string;
  transaction_date: string;
  description: string | null;
  note: string | null;
  category: string;
  amount: string | number;
  transaction_type: string;
  account_id: string;
  to_account_id: string | null;
};

/** Map DB / import labels (e.g. Exp., Income) to canonical types for stats & ledger subtotals. */
export function normalizeTransactionType(
  raw: string | null | undefined
): "income" | "expense" | "transfer" | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t === "income" || t.startsWith("income")) return "income";
  if (
    t === "expense" ||
    t === "exp." ||
    t.startsWith("expense") ||
    t.startsWith("exp.")
  )
    return "expense";
  if (
    t === "transfer-in" ||
    t === "transfer-out" ||
    t.startsWith("transfer")
  )
    return "transfer";
  return null;
}

export type DayGroup = {
  dateKey: string;
  label: string;
  weekday: string;
  income: number;
  expense: number;
  rows: LedgerTx[];
};

export type CategorySlice = {
  category: string;
  total: number;
  pct: number;
};

function numAmount(t: LedgerTx): number {
  const n = Number(t.amount);
  return Number.isFinite(n) ? n : 0;
}

/** Positive magnitude for income/expense rollups (handles legacy signed amounts). */
function statMagnitude(t: LedgerTx): number {
  const n = Math.abs(Number(t.amount));
  return Number.isFinite(n) ? n : 0;
}

function dateKey(iso: string): string {
  return iso.trim().slice(0, 10);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function groupTransactionsByDay(
  txs: LedgerTx[],
  options?: { newestFirst?: boolean }
): DayGroup[] {
  const newestFirst = options?.newestFirst ?? true;
  const map = new Map<string, LedgerTx[]>();
  for (const t of txs) {
    const k = dateKey(t.transaction_date);
    const list = map.get(k) ?? [];
    list.push(t);
    map.set(k, list);
  }
  const keys = Array.from(map.keys()).sort((a, b) =>
    newestFirst ? b.localeCompare(a) : a.localeCompare(b)
  );
  return keys.map((k) => {
    const rows = map.get(k) ?? [];
    const sortedRows = [...rows].sort((a, b) =>
      newestFirst
        ? b.transaction_date.localeCompare(a.transaction_date)
        : a.transaction_date.localeCompare(b.transaction_date)
    );
    let income = 0;
    let expense = 0;
    for (const r of sortedRows) {
      const kind = normalizeTransactionType(r.transaction_type);
      const a = statMagnitude(r);
      if (kind === "income") income += a;
      else if (kind === "expense") expense += a;
    }
    const d = new Date(k + "T12:00:00Z");
    const dayNum = d.getUTCDate();
    const wd = WEEKDAYS[d.getUTCDay()] ?? "";
    return {
      dateKey: k,
      label: `${dayNum}`,
      weekday: wd,
      income,
      expense,
      rows: sortedRows,
    };
  });
}

export function monthIncomeExpense(txs: LedgerTx[]): {
  income: number;
  expense: number;
} {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    const kind = normalizeTransactionType(t.transaction_type);
    const a = statMagnitude(t);
    if (kind === "income") income += a;
    else if (kind === "expense") expense += a;
  }
  return { income, expense };
}

export function rollupByCategory(
  txs: LedgerTx[],
  mode: "income" | "expense"
): CategorySlice[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (normalizeTransactionType(t.transaction_type) !== mode) continue;
    const c = (t.category ?? "").trim() || "Uncategorized";
    map.set(c, (map.get(c) ?? 0) + statMagnitude(t));
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  const list: CategorySlice[] = Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      total: amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
  return list;
}

/** Conic gradient stops for a simple CSS pie (no SVG). */
export function categoryPieStops(slices: CategorySlice[]): string {
  if (slices.length === 0) return "oklch(0.35 0 0)";
  const colors = [
    "oklch(0.62 0.2 25)",
    "oklch(0.65 0.15 45)",
    "oklch(0.7 0.12 85)",
    "oklch(0.55 0.14 160)",
    "oklch(0.55 0.18 250)",
    "oklch(0.6 0.12 300)",
    "oklch(0.5 0.08 0)",
  ];
  let acc = 0;
  const parts: string[] = [];
  slices.forEach((s, i) => {
    const start = acc;
    acc += s.pct;
    const c = colors[i % colors.length];
    parts.push(`${c} ${start}% ${acc}%`);
  });
  return `conic-gradient(${parts.join(", ")})`;
}
