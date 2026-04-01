'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowLeft,
  Plus,
  BarChart3,
  Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TransactionModal } from '@/components/transaction-modal';
import type { Account, CategoryView } from '@/types';
import type { Transaction } from '@/components/transactions-view';
import { cn } from '@/lib/utils';
import { formatMoneyAmount } from '@/lib/format-money';
import { usePortfolioCurrency } from '@/components/context/portfolio-currency-context';
import {
  signedAmountForAccount,
  signedDeltaFromRow,
} from '@/lib/account-tx-delta';

type Visibility = 'active' | 'archived' | 'all';
type PeriodView = 'daily' | 'monthly' | 'annually';

type Props = {
  portfolioId: string;
  accountId: string;
  slug: string;
  accountName: string;
  includedInPortfolioTotals: boolean;
  /** From `accounts.currency`; null → portfolio default from settings */
  accountCurrency: string | null;
};

type RawTx = Record<string, unknown>;

type AccEmbed = {
  account_id: string;
  name: string;
  description: string | null;
  currency: string | null;
  in_total: boolean | null;
  hidden: boolean | null;
} | null;

/** Loaded in a second query so we never rely on PostgREST multi-FK embed hints (often breaks). */
type AccountHydrateRow = {
  account_id: string;
  name: string;
  description: string | null;
  currency: string | null;
  in_total: boolean | null;
  hidden: boolean | null;
};

function rowToAccEmbed(row: AccountHydrateRow | undefined): AccEmbed {
  if (!row) return null;
  return {
    account_id: row.account_id,
    name: row.name,
    description: row.description,
    currency: row.currency,
    in_total: row.in_total,
    hidden: row.hidden,
  };
}

async function fetchAccountHydrateMap(
  supabase: ReturnType<typeof createClient>,
  portfolioId: string,
  raw: RawTx[]
): Promise<Map<string, AccountHydrateRow>> {
  const ids = new Set<string>();
  for (const r of raw) {
    const aid = r.account_id as string | undefined;
    if (aid) ids.add(aid);
    const tid = r.to_account_id as string | null | undefined;
    if (tid) ids.add(tid);
  }
  const map = new Map<string, AccountHydrateRow>();
  if (ids.size === 0) return map;

  const { data, error } = await supabase
    .from('accounts')
    .select('account_id, name, description, currency, in_total, hidden')
    .eq('port_id', portfolioId)
    .in('account_id', Array.from(ids));

  if (error) {
    console.error('account-activity-view: accounts hydrate failed', error);
    return map;
  }
  for (const a of (data ?? []) as AccountHydrateRow[]) {
    map.set(a.account_id, a);
  }
  return map;
}

function mapRowToTransaction(
  r: RawTx,
  portfolioId: string,
  fromAcc: AccEmbed
): Transaction {
  return {
    id: String(r.id),
    transaction_id: r.transaction_id as string,
    transaction_date: r.transaction_date as string,
    amount: Number(r.amount),
    transaction_type: r.transaction_type as Transaction['transaction_type'],
    note: (r.note as string) ?? '',
    description: (r.description as string) ?? '',
    currency: (r.currency as string) ?? null,
    account: {
      account_id: fromAcc?.account_id ?? (r.account_id as string),
      account_name: fromAcc?.name ?? 'Account',
      account_description: fromAcc?.description ?? '',
      currency: fromAcc?.currency ?? null,
      in_total: fromAcc?.in_total ?? null,
      hidden: fromAcc?.hidden ?? null,
    },
    category: (r.category as string) ?? '',
    portfolio: {
      portfolio_id: portfolioId,
      portfolio_title: '',
      portfolio_icon: '{}',
    },
    deleted_at: (r.deleted_at as string) ?? null,
    amount_in_account_currency:
      r.amount_in_account_currency != null
        ? Number(r.amount_in_account_currency)
        : null,
    mm_meta:
      r.mm_meta && typeof r.mm_meta === 'object'
        ? (r.mm_meta as Record<string, unknown>)
        : null,
    tag_labels: [],
    to_account_id: (r.to_account_id as string) ?? null,
  };
}

function transferContext(
  tx: Transaction,
  viewingId: string,
  fromName: string,
  toName: string
): { sub: string; amountSign: 1 | -1 } {
  if (tx.transaction_type !== 'transfer') {
    return { sub: '', amountSign: 1 };
  }
  const fromId = tx.account.account_id;
  if (fromId === viewingId) {
    return {
      sub: ` → ${toName || 'Account'}`,
      amountSign: -1,
    };
  }
  return {
    sub: ` ← ${fromName || 'Account'}`,
    amountSign: 1,
  };
}

function depWdrFromRaw(
  r: {
    amount: unknown;
    transaction_type: string;
    account_id: string;
    to_account_id: string | null;
    deleted_at: string | null;
  },
  accountId: string,
  visibility: Visibility
): { dep: number; wdr: number } {
  if (visibility === 'active' && r.deleted_at) return { dep: 0, wdr: 0 };
  if (visibility === 'archived' && !r.deleted_at) return { dep: 0, wdr: 0 };

  const amt = Number(r.amount);
  const type = r.transaction_type;
  const aid = r.account_id;
  const toId = r.to_account_id;

  if (type === 'income' && aid === accountId) return { dep: amt, wdr: 0 };
  if (type === 'expense' && aid === accountId) return { dep: 0, wdr: amt };
  if (type === 'transfer') {
    let dep = 0;
    let wdr = 0;
    if (toId === accountId) dep += amt;
    if (aid === accountId) wdr += amt;
    return { dep, wdr };
  }
  return { dep: 0, wdr: 0 };
}

const ANNUAL_SPAN = 8;

export function AccountActivityView({
  portfolioId,
  accountId,
  slug,
  accountName,
  includedInPortfolioTotals,
  accountCurrency,
}: Props) {
  const portfolioCurrency = usePortfolioCurrency();
  const primaryDisplayCurrency = accountCurrency ?? portfolioCurrency;

  const [periodView, setPeriodView] = useState<PeriodView>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarYear, setCalendarYear] = useState(() =>
    new Date().getFullYear()
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [counterpartyNames, setCounterpartyNames] = useState<
    Map<string, { from: string; to: string }>
  >(new Map());
  const [deposits, setDeposits] = useState(0);
  const [withdrawals, setWithdrawals] = useState(0);
  const [periodNet, setPeriodNet] = useState(0);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [runningAfterTx, setRunningAfterTx] = useState<Map<string, number>>(
    new Map()
  );

  const [monthCells, setMonthCells] = useState<
    { month: number; dep: number; wdr: number }[]
  >([]);
  const [yearRows, setYearRows] = useState<
    { year: number; dep: number; wdr: number }[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >();
  const [modalDefaultType, setModalDefaultType] = useState<
    'income' | 'expense' | 'transfer' | undefined
  >();
  const [modalDefaults, setModalDefaults] = useState<
    | {
        amount?: number;
        category?: string;
        account?: string;
        to_account?: string;
        note?: string;
        description?: string;
      }
    | undefined
  >();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryView, setCategoryView] = useState<CategoryView[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('active');
  const [loadKey, setLoadKey] = useState(0);
  const [ledgerLoadError, setLedgerLoadError] = useState<string | null>(null);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const transaction of transactions) {
      const date = transaction.transaction_date.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort(
        (a, b) =>
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime()
      );
    }
    return groups;
  }, [transactions]);

  const periodLabel =
    periodView === 'daily'
      ? currentDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })
      : periodView === 'monthly'
        ? String(calendarYear)
        : `${calendarYear - ANNUAL_SPAN + 1}–${calendarYear}`;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLedgerLoadError(null);

      const { data: accRow } = await supabase
        .from('accounts')
        .select('amount, name')
        .eq('account_id', accountId)
        .eq('port_id', portfolioId)
        .maybeSingle();

      if (cancelled) return;
      if (accRow && typeof accRow.amount === 'number') {
        setAccountBalance(accRow.amount);
      } else {
        setAccountBalance(null);
      }

      const orFilter = `account_id.eq.${accountId},to_account_id.eq.${accountId}`;

      if (periodView === 'daily') {
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const endOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        const startIso = startOfMonth.toISOString();
        const endIso = endOfMonth.toISOString();

        let q = supabase
          .from('transactions')
          .select(
            `
            id,
            transaction_id,
            transaction_date,
            amount,
            transaction_type,
            note,
            description,
            currency,
            category,
            deleted_at,
            amount_in_account_currency,
            mm_meta,
            account_id,
            to_account_id,
            port_id
          `
          )
          .eq('port_id', portfolioId)
          .or(orFilter)
          .gte('transaction_date', startIso)
          .lte('transaction_date', endIso)
          .order('transaction_date', { ascending: false });

        if (visibility === 'active') q = q.is('deleted_at', null);
        else if (visibility === 'archived') q = q.not('deleted_at', 'is', null);

        const { data: rows, error } = await q;
        if (cancelled) return;

        if (error) {
          console.error('account-activity-view: transactions query failed', error);
          setLedgerLoadError(error.message);
          setTransactions([]);
          setCounterpartyNames(new Map());
          setDeposits(0);
          setWithdrawals(0);
          setPeriodNet(0);
          return;
        }

        const raw = (rows ?? []) as RawTx[];
        const accMap = await fetchAccountHydrateMap(supabase, portfolioId, raw);
        if (cancelled) return;

        const namesMap = new Map<string, { from: string; to: string }>();
        const mapped: Transaction[] = [];

        for (const r of raw) {
          const aid = r.account_id as string;
          const toId = (r.to_account_id as string) ?? null;
          const fromRow = accMap.get(aid);
          const toRow = toId ? accMap.get(toId) : undefined;
          const tid = r.transaction_id as string;
          namesMap.set(tid, {
            from: fromRow?.name ?? '',
            to: toRow?.name ?? '',
          });
          mapped.push(
            mapRowToTransaction(r, portfolioId, rowToAccEmbed(fromRow))
          );
        }

        setCounterpartyNames(namesMap);
        setTransactions(mapped);

        let dep = 0;
        let wdraw = 0;
        for (const r of raw) {
          const { dep: d, wdr: w } = depWdrFromRaw(
            {
              amount: r.amount,
              transaction_type: r.transaction_type as string,
              account_id: r.account_id as string,
              to_account_id: (r.to_account_id as string) ?? null,
              deleted_at: (r.deleted_at as string) ?? null,
            },
            accountId,
            visibility
          );
          dep += d;
          wdraw += w;
        }
        setDeposits(dep);
        setWithdrawals(wdraw);
        setPeriodNet(dep - wdraw);
        setMonthCells([]);
        setYearRows([]);
        return;
      }

      if (periodView === 'monthly') {
        const start = new Date(calendarYear, 0, 1).toISOString();
        const end = new Date(calendarYear, 11, 31, 23, 59, 59, 999).toISOString();

        let q = supabase
          .from('transactions')
          .select(
            'transaction_date, amount, transaction_type, account_id, to_account_id, deleted_at'
          )
          .eq('port_id', portfolioId)
          .or(orFilter)
          .gte('transaction_date', start)
          .lte('transaction_date', end);

        if (visibility === 'active') q = q.is('deleted_at', null);
        else if (visibility === 'archived') q = q.not('deleted_at', 'is', null);

        const { data: rows, error } = await q;
        if (cancelled) return;

        if (error) {
          console.error('account-activity-view: monthly query failed', error);
          setLedgerLoadError(error.message);
          setMonthCells([]);
          setDeposits(0);
          setWithdrawals(0);
          setPeriodNet(0);
          setTransactions([]);
          return;
        }

        const cells = Array.from({ length: 12 }, (_, month) => ({
          month,
          dep: 0,
          wdr: 0,
        }));

        let yDep = 0;
        let yWdr = 0;

        for (const r of rows ?? []) {
          const row = r as {
            transaction_date: string;
            amount: number;
            transaction_type: string;
            account_id: string;
            to_account_id: string | null;
            deleted_at: string | null;
          };
          const { dep: d, wdr: w } = depWdrFromRaw(row, accountId, visibility);
          yDep += d;
          yWdr += w;
          const m = new Date(row.transaction_date).getMonth();
          cells[m].dep += d;
          cells[m].wdr += w;
        }

        setMonthCells(cells);
        setDeposits(yDep);
        setWithdrawals(yWdr);
        setPeriodNet(yDep - yWdr);
        setTransactions([]);
        setYearRows([]);
        return;
      }

      const firstYear = calendarYear - ANNUAL_SPAN + 1;
      const start = new Date(firstYear, 0, 1).toISOString();
      const end = new Date(calendarYear, 11, 31, 23, 59, 59, 999).toISOString();

      let q = supabase
        .from('transactions')
        .select(
          'transaction_date, amount, transaction_type, account_id, to_account_id, deleted_at'
        )
        .eq('port_id', portfolioId)
        .or(orFilter)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (visibility === 'active') q = q.is('deleted_at', null);
      else if (visibility === 'archived') q = q.not('deleted_at', 'is', null);

      const { data: rows, error } = await q;
      if (cancelled) return;

      if (error) {
        console.error('account-activity-view: annual query failed', error);
        setLedgerLoadError(error.message);
        setYearRows([]);
        setDeposits(0);
        setWithdrawals(0);
        setPeriodNet(0);
        setTransactions([]);
        return;
      }

      const byYear = new Map<number, { dep: number; wdr: number }>();
      for (let y = firstYear; y <= calendarYear; y++) {
        byYear.set(y, { dep: 0, wdr: 0 });
      }

      let tDep = 0;
      let tWdr = 0;

      for (const r of rows ?? []) {
        const row = r as {
          transaction_date: string;
          amount: number;
          transaction_type: string;
          account_id: string;
          to_account_id: string | null;
          deleted_at: string | null;
        };
        const { dep: d, wdr: w } = depWdrFromRaw(row, accountId, visibility);
        tDep += d;
        tWdr += w;
        const y = new Date(row.transaction_date).getFullYear();
        const cur = byYear.get(y) ?? { dep: 0, wdr: 0 };
        cur.dep += d;
        cur.wdr += w;
        byYear.set(y, cur);
      }

      const yrList = Array.from(byYear.entries())
        .map(([year, v]) => ({ year, dep: v.dep, wdr: v.wdr }))
        .sort((a, b) => b.year - a.year);

      setYearRows(yrList);
      setDeposits(tDep);
      setWithdrawals(tWdr);
      setPeriodNet(tDep - tWdr);
      setTransactions([]);
      setMonthCells([]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    periodView,
    calendarYear,
    currentDate,
    visibility,
    accountId,
    portfolioId,
    loadKey,
  ]);

  useEffect(() => {
    if (
      periodView !== 'daily' ||
      visibility !== 'active' ||
      accountBalance == null
    ) {
      setRunningAfterTx(new Map());
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const orFilter = `account_id.eq.${accountId},to_account_id.eq.${accountId}`;

    (async () => {
      const { data: futureRows } = await supabase
        .from('transactions')
        .select(
          'amount, transaction_type, account_id, to_account_id, deleted_at'
        )
        .eq('port_id', portfolioId)
        .or(orFilter)
        .gt('transaction_date', endOfMonth.toISOString())
        .is('deleted_at', null);

      if (cancelled) return;

      let futureSum = 0;
      for (const r of futureRows ?? []) {
        futureSum += signedDeltaFromRow(
          r as {
            amount: number;
            transaction_type: string;
            account_id: string;
            to_account_id: string | null;
          },
          accountId
        );
      }

      const endMonthBal = accountBalance - futureSum;

      const inMonth = [...transactions].sort(
        (a, b) =>
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime()
      );

      let monthSum = 0;
      for (const t of inMonth) {
        monthSum += signedAmountForAccount(t, accountId);
      }
      let opening = endMonthBal - monthSum;

      const map = new Map<string, number>();
      let run = opening;
      for (const t of inMonth) {
        run += signedAmountForAccount(t, accountId);
        map.set(t.transaction_id, run);
      }
      setRunningAfterTx(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    periodView,
    visibility,
    transactions,
    accountBalance,
    accountId,
    portfolioId,
    currentDate,
  ]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('port_id', portfolioId);
      if (accountsData) setAccounts(accountsData);

      const { data: categoriesData } = await supabase
        .from('category_view')
        .select('*')
        .eq('port_id', portfolioId);
      if (categoriesData) setCategoryView(categoriesData);
    })();
  }, [portfolioId]);

  const handleTransactionUpdate = async () => {
    setLoadKey((k) => k + 1);
  };

  const setArchived = async (tx: Transaction, archived: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('transactions')
      .update({
        deleted_at: archived ? new Date().toISOString() : null,
      })
      .eq('transaction_id', tx.transaction_id)
      .eq('port_id', portfolioId);
    if (!error) await handleTransactionUpdate();
  };

  const deletePermanent = async (tx: Transaction) => {
    if (!confirm('Permanently delete this transaction?')) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', tx.transaction_id)
      .eq('port_id', portfolioId);
    if (!error) await handleTransactionUpdate();
  };

  const openNewExpense = () => {
    setEditingTransaction(undefined);
    setModalDefaultType('expense');
    setModalDefaults({ account: accountId });
    setIsModalOpen(true);
  };

  const openPayTransfer = () => {
    setEditingTransaction(undefined);
    setModalDefaultType('transfer');
    setModalDefaults({ to_account: accountId });
    setIsModalOpen(true);
  };

  const onPeriodTabChange = (v: string) => {
    const p = v as PeriodView;
    setPeriodView(p);
    if (p === 'monthly') {
      setCalendarYear(currentDate.getFullYear());
    }
    if (p === 'annually') {
      setCalendarYear(new Date().getFullYear());
    }
  };

  return (
    <div className="relative flex flex-1 flex-col gap-0 pb-24">
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 md:px-6">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 shrink-0" asChild>
          <Link href={`/dashboard/${slug}/accounts`}>
            <ArrowLeft className="size-4" />
            Accounts
          </Link>
        </Button>
        <h1 className="text-center text-base font-semibold tracking-tight md:flex-1 md:text-lg">
          {accountName}
        </h1>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-9" asChild>
            <Link href={`/dashboard/${slug}`} aria-label="Ledger">
              <BarChart3 className="size-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="size-9" asChild>
            <Link
              href={`/dashboard/${slug}/settings?tab=accounts`}
              aria-label="Settings"
            >
              <Pencil className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 md:px-6">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (periodView === 'daily') {
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1
                  )
                );
              } else {
                setCalendarYear((y) => y - 1);
              }
            }}
            className="hover:bg-muted rounded-full p-2"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[6.5rem] text-center text-sm font-medium tabular-nums">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={() => {
              if (periodView === 'daily') {
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1
                  )
                );
              } else {
                setCalendarYear((y) => y + 1);
              }
            }}
            className="hover:bg-muted rounded-full p-2"
            aria-label="Next period"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <Select
          value={visibility}
          onValueChange={(v) => setVisibility(v as Visibility)}
        >
          <SelectTrigger className="h-9 w-[128px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">Everything</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={periodView}
        onValueChange={onPeriodTabChange}
        className="w-full"
      >
        <TabsList className="bg-background text-muted-foreground h-11 w-full justify-start gap-6 rounded-none border-b px-4 md:px-6">
          <TabsTrigger
            value="daily"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Daily
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Monthly
          </TabsTrigger>
          <TabsTrigger
            value="annually"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Annually
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        <div className="bg-card px-3 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Deposit
          </p>
          <p className="text-base font-semibold tabular-nums text-blue-500 md:text-lg">
            {formatMoneyAmount(deposits, primaryDisplayCurrency)}
          </p>
        </div>
        <div className="bg-card px-3 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Withdrawal
          </p>
          <p className="text-base font-semibold tabular-nums text-red-500 md:text-lg">
            {formatMoneyAmount(withdrawals, primaryDisplayCurrency)}
          </p>
        </div>
        <div className="bg-card px-3 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Total
          </p>
          <p className="text-foreground text-base font-semibold tabular-nums md:text-lg">
            {formatMoneyAmount(periodNet, primaryDisplayCurrency)}
          </p>
        </div>
        <div className="bg-card px-3 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Balance
          </p>
          <p
            className={cn(
              'text-base font-semibold tabular-nums md:text-lg',
              includedInPortfolioTotals
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {accountBalance != null
              ? formatMoneyAmount(accountBalance, primaryDisplayCurrency)
              : '—'}
          </p>
        </div>
      </div>

      {ledgerLoadError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mx-4 mt-3 rounded-lg border px-3 py-2 text-sm md:mx-6">
          Could not load activity: {ledgerLoadError}
        </div>
      ) : null}

      {periodView === 'monthly' && monthCells.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4 md:p-6">
          {monthCells.map((c) => (
            <div
              key={c.month}
              className="bg-muted/30 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <p className="text-muted-foreground text-xs font-medium">
                {new Date(calendarYear, c.month, 1).toLocaleDateString(
                  'en-US',
                  { month: 'short' }
                )}
              </p>
              <p className="text-xs tabular-nums text-blue-500">
                +{formatMoneyAmount(c.dep, primaryDisplayCurrency)}
              </p>
              <p className="text-xs tabular-nums text-red-500">
                −{formatMoneyAmount(c.wdr, primaryDisplayCurrency)}
              </p>
              <p className="text-foreground mt-1 text-xs font-medium tabular-nums">
                {formatMoneyAmount(c.dep - c.wdr, primaryDisplayCurrency)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {periodView === 'annually' && yearRows.length > 0 ? (
        <div className="divide-y divide-border px-4 md:px-6">
          {yearRows.map((y) => (
            <div
              key={y.year}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="text-sm font-medium">{y.year}</span>
              <div className="flex gap-4 text-right text-sm tabular-nums">
                <span className="text-blue-500">
                  +{formatMoneyAmount(y.dep, primaryDisplayCurrency)}
                </span>
                <span className="text-red-500">
                  −{formatMoneyAmount(y.wdr, primaryDisplayCurrency)}
                </span>
                <span className="text-foreground min-w-[5rem] font-medium">
                  {formatMoneyAmount(y.dep - y.wdr, primaryDisplayCurrency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {periodView === 'daily' ? (
        <div className="space-y-6 px-0 py-4 md:py-6">
          {transactions.length === 0 && !ledgerLoadError ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm md:px-6">
              No transactions for this account in {periodLabel}. Try another
              month or set visibility to &quot;Everything&quot; if you archived
              them.
            </p>
          ) : null}
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayTransactions]) => {
              const dateObj = new Date(date + 'T12:00:00');
              let dayIn = 0;
              let dayOut = 0;
              for (const t of dayTransactions) {
                const s = signedAmountForAccount(t, accountId);
                if (s > 0) dayIn += s;
                else if (s < 0) dayOut += Math.abs(s);
              }
              return (
                <div key={date} className="space-y-1">
                  <div className="flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-semibold tabular-nums">
                        {dateObj.getDate()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                          {dateObj.toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {dateObj.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs font-medium tabular-nums">
                      {dayIn > 0 ? (
                        <span className="text-blue-500">
                          +{formatMoneyAmount(dayIn, primaryDisplayCurrency)}
                        </span>
                      ) : null}
                      {dayOut > 0 ? (
                        <span className="text-red-500">
                          −{formatMoneyAmount(dayOut, primaryDisplayCurrency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {dayTransactions.map((transaction) => {
                      const names = counterpartyNames.get(
                        transaction.transaction_id
                      );
                      const fromN = names?.from ?? '';
                      const toN = names?.to ?? '';
                      const ctx = transferContext(
                        transaction,
                        accountId,
                        fromN,
                        toN
                      );
                      const amt = Number(transaction.amount);
                      const signed =
                        transaction.transaction_type === 'transfer'
                          ? ctx.amountSign * amt
                          : transaction.transaction_type === 'expense'
                            ? -amt
                            : amt;

                      const run = runningAfterTx.get(
                        transaction.transaction_id
                      );

                      const txCurrency =
                        transaction.currency ??
                        transaction.account.currency ??
                        primaryDisplayCurrency;

                      return (
                        <div
                          key={transaction.transaction_id}
                          className={cn(
                            'hover:bg-muted/40 flex items-start justify-between gap-2 border-b border-border/50 py-2.5 pl-4 pr-1 md:pl-6',
                            transaction.deleted_at && 'opacity-60'
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer rounded-md py-0.5 text-left"
                            onClick={() => {
                              setModalDefaultType(undefined);
                              setModalDefaults(undefined);
                              setEditingTransaction(transaction);
                              setIsModalOpen(true);
                            }}
                          >
                            <span className="text-sm font-medium leading-snug">
                              {transaction.category || '—'}
                              {transaction.note
                                ? ` · ${transaction.note}`
                                : ''}
                              {transaction.deleted_at ? (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (archived)
                                </span>
                              ) : null}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                              {transaction.transaction_type === 'transfer'
                                ? `${fromN || 'Account'}${ctx.sub}`
                                : transaction.description ||
                                  transaction.note ||
                                  ''}
                            </span>
                          </button>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <div className="flex items-center gap-0.5">
                              <span
                                className={cn(
                                  'text-sm font-medium tabular-nums',
                                  signed >= 0
                                    ? 'text-blue-500'
                                    : 'text-red-500'
                                )}
                              >
                                {signed >= 0 ? '+' : ''}
                                {formatMoneyAmount(Math.abs(signed), txCurrency)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label="Actions"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {transaction.deleted_at ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setArchived(transaction, false)
                                      }
                                    >
                                      Restore
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setArchived(transaction, true)
                                      }
                                    >
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      deletePermanent(transaction)
                                    }
                                  >
                                    Delete permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {run != null &&
                            visibility === 'active' &&
                            !transaction.deleted_at ? (
                              <span className="text-muted-foreground text-[11px] tabular-nums">
                                Bal.{' '}
                                {formatMoneyAmount(run, primaryDisplayCurrency)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}

      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shadow-md"
          onClick={openPayTransfer}
        >
          Pay
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-14 shrink-0 rounded-full shadow-lg"
          onClick={openNewExpense}
          aria-label="New transaction"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      <TransactionModal
        open={isModalOpen}
        onOpenChange={(o) => {
          setIsModalOpen(o);
          if (!o) {
            setEditingTransaction(undefined);
            setModalDefaultType(undefined);
            setModalDefaults(undefined);
          }
        }}
        accounts={accounts}
        categoryView={categoryView}
        portId={portfolioId}
        editingTransaction={editingTransaction}
        defaultType={modalDefaultType}
        defaultValues={modalDefaults}
        onTransactionChange={handleTransactionUpdate}
      />
    </div>
  );
}
