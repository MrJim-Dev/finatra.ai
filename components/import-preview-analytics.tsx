"use client";

import * as React from "react";
import { Landmark, PiggyBank, ArrowLeftRight, Scale } from "lucide-react";

import type { DraftTransactionRow } from "@/lib/draft-from-excel";
import type { AccountOption } from "@/lib/account-match";
import { computePreviewAnalytics } from "@/lib/preview-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function signedClass(n: number) {
  if (n > 0.005) return "text-emerald-700 dark:text-emerald-400";
  if (n < -0.005) return "text-destructive";
  return "text-muted-foreground";
}

type Props = {
  drafts: DraftTransactionRow[];
  accounts: AccountOption[];
};

export function ImportPreviewAnalytics({ drafts, accounts }: Props) {
  const [showAllAccounts, setShowAllAccounts] = React.useState(false);

  const analytics = React.useMemo(
    () => computePreviewAnalytics(drafts, accounts),
    [drafts, accounts]
  );

  const { overall, byAccount, byMonth } = analytics;

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
              {formatMoney(overall.incomeVolume)}
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
              {formatMoney(overall.expenseVolume)}
            </p>
            <CardDescription className="text-xs">
              Sum of expense rows in this import
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net (income − exp.)</CardTitle>
            <Scale className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-semibold tabular-nums ${signedClass(overall.netIncomeMinusExpense)}`}
            >
              {formatMoney(overall.netIncomeMinusExpense)}
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
              {formatMoney(overall.transferVolume)}
            </p>
            <CardDescription className="text-xs">
              {overall.transferLegCount} leg(s) · volume = sum of transfer amounts
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
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
                {formatMoney(overall.liabilityExpenseVolume)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Net Δ on liability accts</span>
              <span
                className={`tabular-nums font-medium ${signedClass(overall.liabilityNetDelta)}`}
              >
                {formatMoney(overall.liabilityNetDelta)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Net Δ on other accts</span>
              <span
                className={`tabular-nums font-medium ${signedClass(overall.nonLiabilityNetDelta)}`}
              >
                {formatMoney(overall.nonLiabilityNetDelta)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2">
              <span className="text-muted-foreground">Σ signed (sanity)</span>
              <span
                className={`tabular-nums text-xs ${signedClass(overall.netSignedAcrossAccounts)}`}
              >
                {formatMoney(overall.netSignedAcrossAccounts)}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">By month</CardTitle>
              <CardDescription className="text-xs">
                Income and expense totals per calendar month in this file.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {byMonth.length === 0 ? (
            <p className="text-muted-foreground text-sm">No dated rows.</p>
          ) : (
            <ScrollArea className="h-[min(280px,40vh)] rounded-md border">
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
                        {formatMoney(m.incomeVolume)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatMoney(m.expenseVolume)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-xs tabular-nums ${signedClass(m.netIncomeMinusExpense)}`}
                      >
                        {formatMoney(m.netIncomeMinusExpense)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                        {formatMoney(m.transferVolume)}
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
                        {formatMoney(m.netSignedMovement)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Per account</CardTitle>
              <CardDescription className="text-xs">
                Stored balance from the database; Δ is the effect of this import
                on that account; projected = stored + Δ.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
        <CardContent>
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
                        {formatMoney(a.storedBalance)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                        {a.inflow > 0 ? formatMoney(a.inflow) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-destructive/90">
                        {a.outflow > 0 ? formatMoney(a.outflow) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right text-xs tabular-nums font-medium ${signedClass(a.delta)}`}
                      >
                        {formatMoney(a.delta)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatMoney(a.projected)}
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
        </CardContent>
      </Card>
    </div>
  );
}
