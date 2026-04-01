import type { DraftTransactionRow } from '@/lib/import/draft-from-excel';
import type { AccountOption } from '@/lib/import/account-match';

export function isLiabilityAccountName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(cc|apr)\b/.test(n) ||
    /\bcard\b/.test(n) ||
    /credit/.test(n) ||
    /loan|mortgage|payable|liabilit|overdraft|bnpl|debt|lease|owed|utang/.test(
      n
    )
  );
}

export function parseDraftAmount(row: DraftTransactionRow): number {
  const v = parseFloat(String(row.amount).replace(/,/g, ''));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function signedPrimaryDelta(row: DraftTransactionRow): number {
  const amt = parseDraftAmount(row);
  if (amt <= 0) return 0;
  if (row.transaction_type === 'income') return amt;
  if (row.transaction_type === 'expense') return -amt;
  const flow = row.raw.flowType.trim().toLowerCase();
  if (row.transaction_type === 'transfer') {
    if (flow.includes('transfer-in')) return amt;
    if (flow.includes('transfer-out')) return -amt;
  }
  return 0;
}

function monthKeyFromDate(isoDate: string): string {
  const d = isoDate.trim().slice(0, 10);
  if (d.length >= 7) return d.slice(0, 7);
  return 'unknown';
}

function yearKeyFromDate(isoDate: string): string {
  const d = isoDate.trim().slice(0, 10);
  if (d.length >= 4) return d.slice(0, 4);
  return 'unknown';
}

function monthLabel(key: string): string {
  if (key === 'unknown') return 'Unknown date';
  const [y, m] = key.split('-');
  if (!y || !m) return key;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function yearLabel(key: string): string {
  if (key === 'unknown') return 'Unknown date';
  return key;
}

export type AccountPreviewRollup = {
  accountId: string;
  name: string;
  storedBalance: number;
  delta: number;
  projected: number;
  inflow: number;
  outflow: number;
  rowCount: number;
  isLiability: boolean;
};

export type MonthPreviewRollup = {
  monthKey: string;
  label: string;
  incomeVolume: number;
  expenseVolume: number;
  netIncomeMinusExpense: number;
  transferVolume: number;
  transferLegCount: number;
  netSignedMovement: number;
  rowCount: number;
};

export type YearPreviewRollup = {
  yearKey: string;
  label: string;
  incomeVolume: number;
  expenseVolume: number;
  netIncomeMinusExpense: number;
  transferVolume: number;
  transferLegCount: number;
  netSignedMovement: number;
  rowCount: number;
};

export type PreviewOverall = {
  incomeVolume: number;
  expenseVolume: number;
  netIncomeMinusExpense: number;
  transferVolume: number;
  transferLegCount: number;
  liabilityExpenseVolume: number;
  liabilityNetDelta: number;
  nonLiabilityNetDelta: number;
  netSignedAcrossAccounts: number;
  rowCount: number;
  accountsTouched: number;
};

export type PreviewAnalytics = {
  overall: PreviewOverall;
  byAccount: AccountPreviewRollup[];
  byMonth: MonthPreviewRollup[];
  byYear: YearPreviewRollup[];
};

export function computePreviewAnalytics(
  drafts: DraftTransactionRow[],
  accounts: AccountOption[]
): PreviewAnalytics {
  const nameById = new Map(
    accounts.map((a) => [a.account_id, a.name] as const)
  );
  const storedById = new Map(
    accounts.map((a) => [
      a.account_id,
      typeof a.amount === 'number' && Number.isFinite(a.amount) ? a.amount : 0,
    ] as const)
  );

  type Agg = {
    delta: number;
    inflow: number;
    outflow: number;
    rows: number;
  };
  const byAccountId = new Map<string, Agg>();

  type MonthAgg = {
    incomeVolume: number;
    expenseVolume: number;
    transferVolume: number;
    transferLegCount: number;
    netSignedMovement: number;
    rows: number;
  };
  const byMonth = new Map<string, MonthAgg>();

  type YearAgg = MonthAgg;
  const byYear = new Map<string, YearAgg>();

  let incomeVolume = 0;
  let expenseVolume = 0;
  let transferVolume = 0;
  let transferLegCount = 0;
  let liabilityExpenseVolume = 0;
  let liabilityNetDelta = 0;
  let nonLiabilityNetDelta = 0;
  let netSignedAcrossAccounts = 0;

  for (const row of drafts) {
    const amt = parseDraftAmount(row);
    if (amt <= 0) continue;

    const signed = signedPrimaryDelta(row);
    netSignedAcrossAccounts += signed;

    const mk = monthKeyFromDate(row.transaction_date);
    const yk = yearKeyFromDate(row.transaction_date);
    let ma =
      byMonth.get(mk) ??
      ({
        incomeVolume: 0,
        expenseVolume: 0,
        transferVolume: 0,
        transferLegCount: 0,
        netSignedMovement: 0,
        rows: 0,
      } satisfies MonthAgg);
    let ya =
      byYear.get(yk) ??
      ({
        incomeVolume: 0,
        expenseVolume: 0,
        transferVolume: 0,
        transferLegCount: 0,
        netSignedMovement: 0,
        rows: 0,
      } satisfies YearAgg);
    ma.rows += 1;
    ma.netSignedMovement += signed;
    ya.rows += 1;
    ya.netSignedMovement += signed;

    if (row.transaction_type === 'income') {
      incomeVolume += amt;
      ma.incomeVolume += amt;
      ya.incomeVolume += amt;
    } else if (row.transaction_type === 'expense') {
      expenseVolume += amt;
      ma.expenseVolume += amt;
      ya.expenseVolume += amt;
    } else if (row.transaction_type === 'transfer') {
      transferVolume += amt;
      transferLegCount += 1;
      ma.transferVolume += amt;
      ma.transferLegCount += 1;
      ya.transferVolume += amt;
      ya.transferLegCount += 1;
    }

    byMonth.set(mk, ma);
    byYear.set(yk, ya);

    const aid = row.account_id;
    if (aid) {
      const isLiab = isLiabilityAccountName(
        nameById.get(aid) ?? row.raw.accountName
      );
      if (row.transaction_type === 'expense' && isLiab) {
        liabilityExpenseVolume += amt;
      }
      liabilityNetDelta += isLiab ? signed : 0;
      nonLiabilityNetDelta += isLiab ? 0 : signed;

      let accAgg =
        byAccountId.get(aid) ??
        ({ delta: 0, inflow: 0, outflow: 0, rows: 0 } satisfies Agg);
      accAgg.delta += signed;
      accAgg.rows += 1;
      if (row.transaction_type === 'income') accAgg.inflow += amt;
      else if (row.transaction_type === 'expense') accAgg.outflow += amt;
      else if (row.transaction_type === 'transfer') {
        if (signed > 0) accAgg.inflow += amt;
        else if (signed < 0) accAgg.outflow += amt;
      }
      byAccountId.set(aid, accAgg);
    }
  }

  const byAccount: AccountPreviewRollup[] = accounts.map((a) => {
    const agg = byAccountId.get(a.account_id);
    const stored = storedById.get(a.account_id) ?? 0;
    const delta = agg?.delta ?? 0;
    const isLiability = isLiabilityAccountName(a.name);
    return {
      accountId: a.account_id,
      name: a.name,
      storedBalance: stored,
      delta,
      projected: stored + delta,
      inflow: agg?.inflow ?? 0,
      outflow: agg?.outflow ?? 0,
      rowCount: agg?.rows ?? 0,
      isLiability,
    };
  });

  byAccount.sort((x, y) => {
    const byTouch = y.rowCount - x.rowCount;
    if (byTouch !== 0) return byTouch;
    return Math.abs(y.delta) - Math.abs(x.delta);
  });

  const sortPeriodDesc = (aKey: string, bKey: string) => {
    if (aKey === 'unknown' && bKey !== 'unknown') return 1;
    if (bKey === 'unknown' && aKey !== 'unknown') return -1;
    return bKey.localeCompare(aKey);
  };

  const byMonthList: MonthPreviewRollup[] = Array.from(byMonth.entries())
    .map(([monthKey, m]) => ({
      monthKey,
      label: monthLabel(monthKey),
      incomeVolume: m.incomeVolume,
      expenseVolume: m.expenseVolume,
      netIncomeMinusExpense: m.incomeVolume - m.expenseVolume,
      transferVolume: m.transferVolume,
      transferLegCount: m.transferLegCount,
      netSignedMovement: m.netSignedMovement,
      rowCount: m.rows,
    }))
    .sort((a, b) => sortPeriodDesc(a.monthKey, b.monthKey));

  const byYearList: YearPreviewRollup[] = Array.from(byYear.entries())
    .map(([yearKey, m]) => ({
      yearKey,
      label: yearLabel(yearKey),
      incomeVolume: m.incomeVolume,
      expenseVolume: m.expenseVolume,
      netIncomeMinusExpense: m.incomeVolume - m.expenseVolume,
      transferVolume: m.transferVolume,
      transferLegCount: m.transferLegCount,
      netSignedMovement: m.netSignedMovement,
      rowCount: m.rows,
    }))
    .sort((a, b) => sortPeriodDesc(a.yearKey, b.yearKey));

  const overall: PreviewOverall = {
    incomeVolume,
    expenseVolume,
    netIncomeMinusExpense: incomeVolume - expenseVolume,
    transferVolume,
    transferLegCount,
    liabilityExpenseVolume,
    liabilityNetDelta,
    nonLiabilityNetDelta,
    netSignedAcrossAccounts,
    rowCount: drafts.filter((r) => parseDraftAmount(r) > 0).length,
    accountsTouched: byAccountId.size,
  };

  return { overall, byAccount, byMonth: byMonthList, byYear: byYearList };
}

/** Category label → row count in this import (income vs expense txs only). */
export function categoryUsageCountsFromDrafts(
  drafts: DraftTransactionRow[]
): { income: [string, number][]; expense: [string, number][] } {
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  for (const r of drafts) {
    const cat = (r.category ?? '').trim();
    if (!cat) continue;
    const amt = parseDraftAmount(r);
    if (amt <= 0) continue;
    if (r.transaction_type === 'income') {
      income.set(cat, (income.get(cat) ?? 0) + 1);
    } else if (r.transaction_type === 'expense') {
      expense.set(cat, (expense.get(cat) ?? 0) + 1);
    }
  }
  const sortDesc = (m: Map<string, number>) =>
    Array.from(m.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  return { income: sortDesc(income), expense: sortDesc(expense) };
}
