import { accountIncludedInTotals } from '@/lib/accounts-total';
import { creditCardPayableAndOutstanding } from '@/lib/credit-card-display';
import type { AccountOption } from '@/lib/import/account-match';

export type ImportGroupLite = {
  group_id: string;
  group_name: string | null;
  group_type?: string | null;
};

export type GroupedImportAccountRow = {
  groupId: string;
  groupName: string;
  groupType: string;
  accounts: {
    accountId: string;
    name: string;
    inTotal: boolean;
    hidden: boolean;
    balance: number;
  }[];
};

function groupTypeRank(t: string): number {
  if (t === 'credit') return 2;
  return 0;
}

/** Non-credit groups first, then credit; then by group name. */
export function buildGroupedImportAccountRows(
  accounts: AccountOption[],
  groups: ImportGroupLite[]
): GroupedImportAccountRow[] {
  const gMap = new Map(
    groups.map((g) => [
      g.group_id,
      {
        name: (g.group_name ?? '').trim() || 'Unnamed group',
        type: (g.group_type ?? 'default').trim() || 'default',
      },
    ])
  );

  const byGid = new Map<string, AccountOption[]>();
  for (const a of accounts) {
    const gid = a.group_id ?? '';
    const list = byGid.get(gid) ?? [];
    list.push(a);
    byGid.set(gid, list);
  }

  const orderedGroups = [...groups].sort((a, b) => {
    const ta = gMap.get(a.group_id)?.type ?? 'default';
    const tb = gMap.get(b.group_id)?.type ?? 'default';
    const r = groupTypeRank(ta) - groupTypeRank(tb);
    if (r !== 0) return r;
    const na = (a.group_name ?? '').toLowerCase();
    const nb = (b.group_name ?? '').toLowerCase();
    return na.localeCompare(nb);
  });

  const out: GroupedImportAccountRow[] = [];
  const usedGids = new Set<string>();

  for (const g of orderedGroups) {
    const meta = gMap.get(g.group_id);
    const list = byGid.get(g.group_id);
    if (!list || list.length === 0) continue;
    usedGids.add(g.group_id);
    const sortedAccts = [...list].sort((x, y) =>
      x.name.localeCompare(y.name)
    );
    out.push({
      groupId: g.group_id,
      groupName: meta?.name ?? 'Unnamed group',
      groupType: meta?.type ?? 'default',
      accounts: sortedAccts.map((a) => ({
        accountId: a.account_id,
        name: a.name,
        inTotal: accountIncludedInTotals(a.in_total),
        hidden: !!a.hidden,
        balance:
          typeof a.amount === 'number' && Number.isFinite(a.amount)
            ? a.amount
            : 0,
      })),
    });
  }

  const orphanGids = Array.from(byGid.keys()).filter(
    (gid) => !usedGids.has(gid)
  );
  if (orphanGids.length > 0) {
    const merged: AccountOption[] = [];
    for (const gid of orphanGids) {
      merged.push(...(byGid.get(gid) ?? []));
    }
    merged.sort((x, y) => x.name.localeCompare(y.name));
    out.push({
      groupId: '__orphan__',
      groupName: 'Other / unmatched group',
      groupType: 'default',
      accounts: merged.map((a) => ({
        accountId: a.account_id,
        name: a.name,
        inTotal: accountIncludedInTotals(a.in_total),
        hidden: !!a.hidden,
        balance:
          typeof a.amount === 'number' && Number.isFinite(a.amount)
            ? a.amount
            : 0,
      })),
    });
  }

  return out;
}

/** Mirrors dashboard accounts page totals (stored balances only). */
export function computeImportPortfolioTotals(
  accounts: AccountOption[],
  groups: ImportGroupLite[]
): {
  assetsInTotal: number;
  liabilitiesInTotal: number;
  netAssetsMinusLiabilities: number;
  creditPayableInTotal: number;
  creditOutstandingInTotal: number;
  includedAccountCount: number;
} {
  const typeByGid = new Map(
    groups.map((g) => [g.group_id, (g.group_type ?? 'default').trim()])
  );

  let assetsInTotal = 0;
  let liabilitiesInTotal = 0;
  let creditPayableInTotal = 0;
  let creditOutstandingInTotal = 0;
  let includedAccountCount = 0;

  for (const a of accounts) {
    if (!accountIncludedInTotals(a.in_total)) continue;
    includedAccountCount += 1;
    const bal =
      typeof a.amount === 'number' && Number.isFinite(a.amount) ? a.amount : 0;
    const gt = typeByGid.get(a.group_id ?? '') ?? 'default';

    if (gt === 'credit') {
      const { payable, outstanding } = creditCardPayableAndOutstanding(bal);
      creditPayableInTotal += payable;
      creditOutstandingInTotal += outstanding;
    }

    if (bal < 0) {
      liabilitiesInTotal += Math.abs(bal);
    }
    if (gt !== 'credit' && bal > 0) {
      assetsInTotal += bal;
    }
  }

  return {
    assetsInTotal,
    liabilitiesInTotal,
    netAssetsMinusLiabilities: assetsInTotal - liabilitiesInTotal,
    creditPayableInTotal,
    creditOutstandingInTotal,
    includedAccountCount,
  };
}
