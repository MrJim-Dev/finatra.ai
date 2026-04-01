'use client';

import * as React from 'react';
import { Landmark, PiggyBank, ArrowLeftRight, Scale } from 'lucide-react';

import type { DraftTransactionRow } from '@/lib/import/draft-from-excel';
import type { AccountOption } from '@/lib/import/account-match';
import { computePreviewAnalytics } from '@/lib/import/preview-analytics';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoneyAmount } from '@/lib/format-money';
import { usePortfolioCurrency } from '@/components/context/portfolio-currency-context';

function signedClass(n: number) {
  if (n > 0.005) return 'text-emerald-700 dark:text-emerald-400';
  if (n < -0.005) return 'text-destructive';
  return 'text-muted-foreground';
}

type Props = {
  drafts: DraftTransactionRow[];
  accounts: AccountOption[];
  /** Hide liability heuristics + import coverage when MM backup overview shows portfolio totals below. */
  companionMmbakOverview?: boolean;
};

export function ImportPreviewAnalytics({
  drafts,
  accounts,
  companionMmbakOverview = false,
}: Props) {
  const portfolioCurrency = usePortfolioCurrency();
  const [showAllAccounts, setShowAllAccounts] = React.useState(false);

  const analytics = React.useMemo(
    () => computePreviewAnalytics(drafts, accounts),
    [drafts, accounts]
  );

  const { overall, byAccount, byMonth, byYear } = analytics;

  const touchedAccounts = React.useMemo(
    () => byAccount.filter((a) => a.rowCount > 0),
    [byAccount]
  );

  const liabilityTouched = touchedAccounts.filter((a) => a.isLiability);
  const displayAccounts = showAllAccounts ? byAccount : touchedAccounts;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <PiggyBank className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">
              {formatMoneyAmount(overall.incomeVolume, portfolioCurrency)}
            </p>
            <CardDescription className="text-xs">
              Sum of income rows in this import
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <span className="text-muted-foreground text-xs font-medium">
              Σ
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">
              {formatMoneyAmount(overall.expenseVolume, portfolioCurrency)}
            </p>
            <CardDescription className="text-xs">
              Sum of expense rows in this import
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net (income − exp.)
            </CardTitle>
            <Scale className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-semibold tabular-nums ${signedClass(overall.netIncomeMinusExpense)}`}
            >
              {formatMoneyAmount(overall.netIncomeMinusExpense, portfolioCurrency)}
            </p>
            <CardDescription className="text-xs">
              Ignores transfer legs (those net to zero across accounts)
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfers</CardTitle>
            <ArrowLeftRight className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">
              {formatMoneyAmount(overall.transferVolume, portfolioCurrency)}
            </p>
            <CardDescription className="text-xs">
              {overall.transferLegCount} leg(s) · volume = sum of transfer amounts
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div
        className={
          companionMmbakOverview ? 'hidden' : 'grid gap-3 lg:grid-cols-2'
        }
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Liabilities (name heuristic)
            </CardTitle>
            <CardDescription className="text-xs">
              Accounts whose names match credit / loan style keywords. Expense
              volume on those accounts only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Expense volume</span>
              <span className="tabular-nums font-medium">
                {formatMoneyAmount(overall.liabilityExpenseVolume, portfolioCurrency)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Net Δ on liability accts
              </span>
              <span
                className={`tabular-nums font-medium ${signedClass(overall.liabilityNetDelta)}`}
              >
                {formatMoneyAmount(overall.liabilityNetDelta, portfolioCurrency)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Net Δ on other accts</span>
              <span
                className={`tabular-nums font-medium ${signedClass(overall.nonLiabilityNetDelta)}`}
              >
                {formatMoneyAmount(overall.nonLiabilityNetDelta, portfolioCurrency)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2">
              <span className="text-muted-foreground">Σ signed (sanity)</span>
              <span
                className={`tabular-nums text-xs ${signedClass(overall.netSignedAcrossAccounts)}`}
              >
                {formatMoneyAmount(overall.netSignedAcrossAccounts, portfolioCurrency)}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Near zero if transfer pairs are complete. Stored balances are from
              the database; projected = stored + import Δ per account below.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Import coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Rows with amount</span>
              <span className="font-medium tabular-nums">{overall.rowCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Accounts touched</span>
              <span className="font-medium tabular-nums">
                {overall.accountsTouched}
              </span>
            </div>
            {liabilityTouched.length > 0 && (
              <div className="text-muted-foreground flex flex-wrap gap-1 text-xs">
                <Landmark className="size-3.5 shrink-0" />
                {liabilityTouched.slice(0, 6).map((a) => (
                  <Badge key={a.accountId} variant="outline" className="text-xs">
                    {a.name}
                  </Badge>
                ))}
                {liabilityTouched.length > 6 && (
                  <span>+{liabilityTouched.length - 6} more</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Import breakdown</CardTitle>
              <CardDescription className="text-xs">
                By period and by account. Newest months and years first.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
              <Label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showAllAccounts}
                  onChange={(e) => setShowAllAccounts(e.target.checked)}
                  className="border-input rounded"
                />
                Show all accounts
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="year" className="w-full gap-3">
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="year" className="text-xs sm:text-sm">
                By year
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs sm:text-sm">
                By month
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs sm:text-sm">
                Per account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="year" className="mt-0">
              {byYear.length === 0 ? (
                <p className="text-muted-foreground py-4 text-sm">No dated rows.</p>
              ) : (
                <ScrollArea className="h-[min(280px,42vh)] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net I−E</TableHead>
                        <TableHead className="text-right">Transfers</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Net signed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byYear.map((y) => (
                        <TableRow key={y.yearKey}>
                          <TableCell className="font-medium">{y.label}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(y.incomeVolume, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(y.expenseVolume, portfolioCurrency)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums ${signedClass(y.netIncomeMinusExpense)}`}
                          >
                            {formatMoneyAmount(y.netIncomeMinusExpense, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                            {formatMoneyAmount(y.transferVolume, portfolioCurrency)}
                            <span className="ml-1 opacity-70">
                              ({y.transferLegCount})
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {y.rowCount}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums ${signedClass(y.netSignedMovement)}`}
                          >
                            {formatMoneyAmount(y.netSignedMovement, portfolioCurrency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="month" className="mt-0">
              {byMonth.length === 0 ? (
                <p className="text-muted-foreground py-4 text-sm">No dated rows.</p>
              ) : (
                <ScrollArea className="h-[min(300px,45vh)] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net I−E</TableHead>
                        <TableHead className="text-right">Transfers</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Net signed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byMonth.map((m) => (
                        <TableRow key={m.monthKey}>
                          <TableCell className="font-medium">{m.label}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(m.incomeVolume, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(m.expenseVolume, portfolioCurrency)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums ${signedClass(m.netIncomeMinusExpense)}`}
                          >
                            {formatMoneyAmount(m.netIncomeMinusExpense, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                            {formatMoneyAmount(m.transferVolume, portfolioCurrency)}
                            <span className="ml-1 opacity-70">
                              ({m.transferLegCount})
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {m.rowCount}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums ${signedClass(m.netSignedMovement)}`}
                          >
                            {formatMoneyAmount(m.netSignedMovement, portfolioCurrency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="accounts" className="mt-0">
              <p className="text-muted-foreground mb-2 text-[11px] leading-snug">
                Stored = DB balance; Δ = effect of this file; projected = stored + Δ.
              </p>
              {displayAccounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No accounts with import rows. Map accounts in the row editor or
                  re-upload.
                </p>
              ) : (
                <ScrollArea className="h-[min(320px,45vh)] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Stored</TableHead>
                        <TableHead className="text-right">In</TableHead>
                        <TableHead className="text-right">Out</TableHead>
                        <TableHead className="text-right">Δ import</TableHead>
                        <TableHead className="text-right">Projected</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayAccounts.map((a) => (
                        <TableRow key={a.accountId}>
                          <TableCell className="max-w-[180px]">
                            <span className="truncate font-medium">{a.name}</span>
                            {a.isLiability && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                Liability?
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(a.storedBalance, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                            {a.inflow > 0 ? formatMoneyAmount(a.inflow, portfolioCurrency) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-destructive/90">
                            {a.outflow > 0 ? formatMoneyAmount(a.outflow, portfolioCurrency) : '—'}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums font-medium ${signedClass(a.delta)}`}
                          >
                            {formatMoneyAmount(a.delta, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatMoneyAmount(a.projected, portfolioCurrency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                            {a.rowCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
