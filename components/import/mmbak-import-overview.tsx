'use client';

import * as React from 'react';
import { Database } from 'lucide-react';

import type { DraftTransactionRow } from '@/lib/import/draft-from-excel';
import {
  buildGroupedImportAccountRows,
  computeImportPortfolioTotals,
  type ImportGroupLite,
} from '@/lib/import/import-accounts-overview';
import { mmCategoryZdoToFinatraType } from '@/lib/import/mmbak-category-meta';
import type { MmbakExtensionPayload } from '@/lib/import/mmbak-extension';
import type { AccountOption } from '@/lib/import/account-match';
import { formatMoneyAmount } from '@/lib/format-money';
import { usePortfolioCurrency } from '@/components/context/portfolio-currency-context';
import type { ImportStructurePreview } from '@/lib/import/mmbak-structure';
import {
  categoryUsageCountsFromDrafts,
  computePreviewAnalytics,
} from '@/lib/import/preview-analytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


function groupTypeLabel(t: string): string {
  if (t === 'credit') return 'Credit cards';
  if (t === 'debit') return 'Debit';
  return 'Default';
}

function groupTypeBadgeVariant(
  t: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (t === 'credit') return 'destructive';
  if (t === 'debit') return 'secondary';
  return 'outline';
}

type Props = {
  accounts: AccountOption[];
  groups: ImportGroupLite[];
  extension: MmbakExtensionPayload | null;
  drafts: DraftTransactionRow[];
  /** When set, “Totals” column and group types reflect the backup; balances use import-projected amounts. */
  structure?: ImportStructurePreview | null;
};

export function MmbakImportOverview({
  accounts,
  groups,
  extension,
  drafts,
  structure,
}: Props) {
  const portfolioCurrency = usePortfolioCurrency();

  const previewRollups = React.useMemo(
    () => computePreviewAnalytics(drafts, accounts),
    [drafts, accounts]
  );

  const projectedByAccountId = React.useMemo(
    () => new Map(previewRollups.byAccount.map((r) => [r.accountId, r.projected])),
    [previewRollups.byAccount]
  );

  const mmAccountFieldByName = React.useMemo(() => {
    if (!structure?.accounts?.length) return null;
    return new Map(
      structure.accounts.map(
        (r) =>
          [
            r.finatraAccountName,
            { inTotal: r.inTotal, hidden: r.hidden },
          ] as const
      )
    );
  }, [structure]);

  const mmGroupTypeByFinatraName = React.useMemo(() => {
    if (!structure?.groups?.length) return null;
    return new Map(
      structure.groups.map((g) => [g.finatraGroupName, g.groupType] as const)
    );
  }, [structure]);

  const accountsForOverview = React.useMemo((): AccountOption[] => {
    return accounts.map((a) => {
      const projected = projectedByAccountId.get(a.account_id);
      const mm = mmAccountFieldByName?.get(a.name);
      return {
        ...a,
        amount:
          projected !== undefined ? projected : (a.amount ?? 0),
        in_total: mm ? mm.inTotal : a.in_total,
        hidden: mm ? mm.hidden : a.hidden,
      };
    });
  }, [accounts, projectedByAccountId, mmAccountFieldByName]);

  const groupsForOverview = React.useMemo((): ImportGroupLite[] => {
    if (!mmGroupTypeByFinatraName) return groups;
    return groups.map((g) => {
      const nm = (g.group_name ?? '').trim();
      const t = mmGroupTypeByFinatraName.get(nm);
      return t !== undefined ? { ...g, group_type: t } : g;
    });
  }, [groups, mmGroupTypeByFinatraName]);

  const totals = React.useMemo(
    () => computeImportPortfolioTotals(accountsForOverview, groupsForOverview),
    [accountsForOverview, groupsForOverview]
  );

  const grouped = React.useMemo(
    () => buildGroupedImportAccountRows(accountsForOverview, groupsForOverview),
    [accountsForOverview, groupsForOverview]
  );

  const categoryCatalog = React.useMemo(() => {
    if (!extension?.categories?.length) {
      return {
        income: [] as string[],
        expense: [] as string[],
        other: [] as string[],
      };
    }
    const income: string[] = [];
    const expense: string[] = [];
    const other: string[] = [];
    const seen = new Set<string>();
    for (const c of extension.categories) {
      const name = (c.zname ?? '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const t = mmCategoryZdoToFinatraType(c.zdo_type);
      if (t === 'income') income.push(name);
      else if (t === 'expense') expense.push(name);
      else other.push(name);
    }
    income.sort((a, b) => a.localeCompare(b));
    expense.sort((a, b) => a.localeCompare(b));
    other.sort((a, b) => a.localeCompare(b));
    return { income, expense, other };
  }, [extension]);

  const tagNames = React.useMemo(() => {
    if (!extension?.tags?.length) return [];
    const names = extension.tags
      .map((t) => (t.zname ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [extension]);

  const usage = React.useMemo(
    () => categoryUsageCountsFromDrafts(drafts),
    [drafts]
  );

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4" />
          Money Manager — accounts &amp; catalog
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          <strong>group_type</strong> uses the backup group name first (e.g. “Loan” → default), then{' '}
          <code className="text-[11px]">ZSTATUS</code> / numeric kind when the name is ambiguous.{' '}
          <strong>Include in totals</strong> comes from{' '}
          <code className="text-[11px]">ZASSET.ZISREFLECT</code> (<code className="text-[11px]">0</code>{' '}
          = yes, <code className="text-[11px]">1</code> = no). Balances here are{' '}
          <strong>stored + this import’s Δ</strong> (projected), not raw DB{' '}
          <code className="text-[11px]">accounts.amount</code> before commit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase tracking-wide">
            Portfolio totals (included accounts · projected balance after import)
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 px-2 py-1 font-normal tabular-nums">
              <span className="text-muted-foreground">Assets</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatMoneyAmount(totals.assetsInTotal, portfolioCurrency)}
              </span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2 py-1 font-normal tabular-nums">
              <span className="text-muted-foreground">Liabilities</span>
              <span className="text-red-600 dark:text-red-400">
                −{formatMoneyAmount(totals.liabilitiesInTotal, portfolioCurrency)}
              </span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2 py-1 font-normal tabular-nums">
              <span className="text-muted-foreground">Net</span>
              <span>
                {formatMoneyAmount(totals.netAssetsMinusLiabilities, portfolioCurrency)}
              </span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2 py-1 font-normal tabular-nums">
              <span className="text-muted-foreground">CC payable</span>
              <span className="text-red-600 dark:text-red-400">
                {formatMoneyAmount(totals.creditPayableInTotal, portfolioCurrency)}
              </span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2 py-1 font-normal tabular-nums">
              <span className="text-muted-foreground">CC outst.</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatMoneyAmount(totals.creditOutstandingInTotal, portfolioCurrency)}
              </span>
            </Badge>
            <Badge variant="outline" className="px-2 py-1 font-normal">
              <span className="text-muted-foreground">In totals: </span>
              {totals.includedAccountCount} accts
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase tracking-wide">
            Accounts by group
          </p>
          {grouped.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accounts loaded.</p>
          ) : (
            <ScrollArea className="h-[min(380px,48vh)] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-[76px]">Totals</TableHead>
                    <TableHead className="w-[64px]">Hid</TableHead>
                    <TableHead className="text-right">Bal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g) => {
                    const subtotal = g.accounts.reduce(
                      (s, a) => s + a.balance,
                      0
                    );
                    return (
                      <React.Fragment key={g.groupId}>
                        {g.accounts.map((a, i) => (
                          <TableRow key={a.accountId}>
                            {i === 0 ? (
                              <TableCell
                                className="align-top text-xs font-medium"
                                rowSpan={g.accounts.length + 1}
                              >
                                <div className="flex flex-col gap-1 py-0.5">
                                  <span>{g.groupName}</span>
                                  <Badge
                                    variant={groupTypeBadgeVariant(g.groupType)}
                                    className="w-fit text-[10px] font-normal"
                                  >
                                    {groupTypeLabel(g.groupType)}
                                  </Badge>
                                </div>
                              </TableCell>
                            ) : null}
                            {i === 0 ? (
                              <TableCell
                                className="text-muted-foreground align-top font-mono text-[10px]"
                                rowSpan={g.accounts.length + 1}
                              >
                                {g.groupType}
                              </TableCell>
                            ) : null}
                            <TableCell className="text-xs font-medium">
                              {a.name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.inTotal ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  yes
                                </span>
                              ) : (
                                <span className="text-muted-foreground">no</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.hidden ? (
                                <span className="text-amber-700 dark:text-amber-400">
                                  y
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right text-xs tabular-nums ${
                                a.balance < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : a.balance > 0
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {formatMoneyAmount(a.balance, portfolioCurrency)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40">
                          <TableCell
                            colSpan={3}
                            className="text-muted-foreground text-right text-[11px] font-medium"
                          >
                            Group subtotal ({g.accounts.length} acct)
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs font-semibold tabular-nums ${
                              subtotal < 0
                                ? 'text-red-600 dark:text-red-400'
                                : subtotal > 0
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {formatMoneyAmount(subtotal, portfolioCurrency)}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-muted-foreground mb-1 text-[11px] font-medium uppercase">
              Categories to create ({categoryCatalog.income.length + categoryCatalog.expense.length + categoryCatalog.other.length})
            </p>
            <ScrollArea className="h-44 rounded-md border p-2">
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Inc </span>
                  {categoryCatalog.income.length
                    ? categoryCatalog.income.slice(0, 80).join(' · ')
                    : '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Exp </span>
                  {categoryCatalog.expense.length
                    ? categoryCatalog.expense.slice(0, 80).join(' · ')
                    : '—'}
                </div>
                {categoryCatalog.other.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">? </span>
                    {categoryCatalog.other.slice(0, 40).join(' · ')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-[11px] font-medium uppercase">
              Tags ({tagNames.length})
            </p>
            <ScrollArea className="h-44 rounded-md border p-2">
              {tagNames.length === 0 ? (
                <p className="text-muted-foreground text-xs">—</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {tagNames.map((n) => (
                    <Badge key={n} variant="secondary" className="text-[10px] font-normal">
                      {n}
                    </Badge>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-[11px] font-medium uppercase">
              Row counts in file
            </p>
            <div className="grid h-44 grid-cols-2 gap-2 rounded-md border p-2 text-[11px]">
              <div className="min-h-0 overflow-y-auto">
                <p className="text-muted-foreground sticky top-0 bg-card pb-1">Income</p>
                <ul className="space-y-0.5">
                  {usage.income.slice(0, 25).map(([n, c]) => (
                    <li key={n} className="flex justify-between gap-2 tabular-nums">
                      <span className="min-w-0 truncate">{n}</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-h-0 overflow-y-auto">
                <p className="text-muted-foreground sticky top-0 bg-card pb-1">Expense</p>
                <ul className="space-y-0.5">
                  {usage.expense.slice(0, 25).map(([n, c]) => (
                    <li key={n} className="flex justify-between gap-2 tabular-nums">
                      <span className="min-w-0 truncate">{n}</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
