'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Upload,
} from 'lucide-react';
import { PortfolioImportSheet } from '@/components/import/portfolio-import-sheet';
import { createClient } from '@/lib/supabase/client';
import { TransactionModal } from '@/components/transaction-modal';
import type { Account, CategoryView } from '@/types';
import { cn } from '@/lib/utils';
import { formatMoneyAmount } from '@/lib/format-money';
import { usePortfolioCurrency } from '@/components/context/portfolio-currency-context';

type TxAccount = {
  account_id: string;
  account_name: string;
  account_description: string;
  currency?: string | null;
  in_total?: boolean | null;
  hidden?: boolean | null;
};

export interface Transaction {
  id: string;
  transaction_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  note: string;
  description: string;
  currency?: string | null;
  account: TxAccount;
  category: string;
  portfolio: {
    portfolio_id: string;
    portfolio_title: string;
    portfolio_icon: string;
  };
  deleted_at?: string | null;
  amount_in_account_currency?: number | null;
  mm_meta?: Record<string, unknown> | null;
  tag_labels?: string[];
  /** Set for transfers; modal "to" account. */
  to_account_id?: string | null;
}

interface TransactionViewProps {
  portfolioId: string;
}

type Visibility = 'active' | 'archived' | 'all';

export function TransactionsView({ portfolioId }: TransactionViewProps) {
  const portfolioCurrency = usePortfolioCurrency();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryView, setCategoryView] = useState<CategoryView[]>([]);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('active');

  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.transaction_date.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );

  const currentMonth = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const fetchTransactions = useCallback(async () => {
    const supabase = createClient();

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
        accounts!transactions_account_id_fkey (
          account_id,
          name,
          description,
          currency,
          in_total,
          hidden
        )
      `
      )
      .eq('port_id', portfolioId)
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString())
      .order('transaction_date', { ascending: false });

    if (visibility === 'active') {
      q = q.is('deleted_at', null);
    } else if (visibility === 'archived') {
      q = q.not('deleted_at', 'is', null);
    }

    const { data: rows, error } = await q;

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    const raw = (rows ?? []) as Record<string, unknown>[];
    const txIds = raw.map((r) => r.transaction_id as string);
    const tagMap = new Map<string, string[]>();

    if (txIds.length > 0) {
      const { data: tt } = await supabase
        .from('transaction_tags')
        .select('transaction_id, tags(name)')
        .in('transaction_id', txIds);

      for (const row of tt ?? []) {
        const tid = row.transaction_id as string;
        const rawTag = row.tags as unknown;
        const tagName =
          rawTag &&
          typeof rawTag === 'object' &&
          !Array.isArray(rawTag) &&
          'name' in rawTag
            ? String((rawTag as { name: string }).name)
            : '';
        if (!tagName) continue;
        const arr = tagMap.get(tid) ?? [];
        arr.push(tagName);
        tagMap.set(tid, arr);
      }
    }

    const mapped: Transaction[] = raw.map((r) => {
      const acc = r.accounts as {
        account_id: string;
        name: string;
        description: string | null;
        currency: string | null;
        in_total: boolean | null;
        hidden: boolean | null;
      } | null;

      const txId = r.transaction_id as string;

      return {
        id: String(r.id),
        transaction_id: txId,
        transaction_date: r.transaction_date as string,
        amount: Number(r.amount),
        transaction_type: r.transaction_type as Transaction['transaction_type'],
        note: (r.note as string) ?? '',
        description: (r.description as string) ?? '',
        currency: (r.currency as string) ?? null,
        account: {
          account_id: acc?.account_id ?? (r.account_id as string),
          account_name: acc?.name ?? 'Account',
          account_description: acc?.description ?? '',
          currency: acc?.currency ?? null,
          in_total: acc?.in_total ?? null,
          hidden: acc?.hidden ?? null,
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
        tag_labels: tagMap.get(txId) ?? [],
        to_account_id: (r.to_account_id as string) ?? null,
      };
    });

    setTransactions(mapped);

    const activeOnly = mapped.filter((t) => !t.deleted_at);
    const income = activeOnly.reduce(
      (sum, t) =>
        t.transaction_type === 'income' ? sum + Number(t.amount) : sum,
      0
    );
    const expenses = activeOnly.reduce(
      (sum, t) =>
        t.transaction_type === 'expense' ? sum + Number(t.amount) : sum,
      0
    );

    setTotalIncome(income);
    setTotalExpenses(expenses);
    setTotalBalance(income - expenses);
  }, [currentDate, portfolioId, visibility]);

  const fetchAccountsAndCategories = useCallback(async () => {
    const supabase = createClient();

    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('port_id', portfolioId);

    if (accountsData) {
      setAccounts(accountsData);
    }

    const { data: categoriesData } = await supabase
      .from('category_view')
      .select('*')
      .eq('port_id', portfolioId);

    if (categoriesData) {
      setCategoryView(categoriesData);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchAccountsAndCategories();
  }, [fetchAccountsAndCategories]);

  const handleTransactionClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleTransactionUpdate = async () => {
    await Promise.all([fetchTransactions(), fetchAccountsAndCategories()]);
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

    if (error) {
      console.error(error);
      return;
    }
    await handleTransactionUpdate();
  };

  const deletePermanent = async (tx: Transaction) => {
    if (
      !confirm(
        'Permanently delete this transaction? This cannot be undone.'
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', tx.transaction_id)
      .eq('port_id', portfolioId);

    if (error) {
      console.error(error);
      return;
    }
    await handleTransactionUpdate();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="hover:bg-muted rounded-full p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">{currentMonth}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleNextMonth}
            className="hover:bg-muted rounded-full p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as Visibility)}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">Everything</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setImportSheetOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <PortfolioImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        portfolioId={portfolioId}
        onDataChanged={handleTransactionUpdate}
      />

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-muted/30 flex justify-between rounded-lg px-4 py-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Income</span>
          <div className="font-medium text-blue-500">
            {formatMoneyAmount(totalIncome, portfolioCurrency)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Expenses</span>
          <div className="font-medium text-red-500">
            {formatMoneyAmount(totalExpenses, portfolioCurrency)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Total</span>
          <div className="font-medium">
            {formatMoneyAmount(totalBalance, portfolioCurrency)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTransactions)
          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
          .map(([date, dayTransactions]) => {
            const dateObj = new Date(date);
            const dayTotal = dayTransactions.reduce(
              (sum, t) =>
                sum +
                (t.transaction_type === 'expense'
                  ? -Number(t.amount)
                  : Number(t.amount)),
              0
            );
            const dayExpenses = dayTransactions.reduce(
              (sum, t) =>
                t.transaction_type === 'expense' ? sum + Number(t.amount) : sum,
              0
            );

            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">
                      {dateObj.getDate()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">
                        {dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
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
                  <div className="flex gap-4">
                    <span
                      className={`text-sm font-medium ${dayTotal >= 0 ? 'text-blue-500' : 'text-red-500'}`}
                    >
                      {formatMoneyAmount(
                        Math.abs(dayTotal),
                        portfolioCurrency
                      )}
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      {formatMoneyAmount(dayExpenses, portfolioCurrency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  {dayTransactions.map((transaction) => (
                    <div
                      key={transaction.transaction_id}
                      className={cn(
                        'bg-card flex items-center justify-between gap-2 rounded-lg py-2 pl-4 pr-1 transition-colors hover:bg-muted/50',
                        transaction.deleted_at && 'opacity-60'
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer rounded-md py-1 text-left"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <span className="text-sm font-medium">
                          {transaction.note || '—'}
                          {transaction.deleted_at ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (archived)
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {transaction.category} •{' '}
                          {transaction.account.account_name}
                          {transaction.tag_labels &&
                          transaction.tag_labels.length > 0 ? (
                            <span className="text-primary/80">
                              {' '}
                              · {transaction.tag_labels.join(', ')}
                            </span>
                          ) : null}
                          {transaction.description ? (
                            <span className="ml-1">
                              · {transaction.description}
                            </span>
                          ) : null}
                          {transaction.amount_in_account_currency != null &&
                          transaction.amount_in_account_currency !==
                            Number(transaction.amount) ? (
                            <span className="ml-1 block text-[10px] text-amber-600/90">
                              Book:{' '}
                              {formatMoneyAmount(
                                transaction.amount_in_account_currency,
                                transaction.account.currency ?? portfolioCurrency
                              )}{' '}
                              in account currency
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <span
                          className={`text-sm font-medium ${
                            transaction.transaction_type === 'income'
                              ? 'text-blue-500'
                              : transaction.transaction_type === 'expense'
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {formatMoneyAmount(
                            Number(transaction.amount),
                            transaction.currency ?? portfolioCurrency
                          )}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              aria-label="Transaction actions"
                              onClick={(e) => e.stopPropagation()}
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
                                Restore to ledger
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setArchived(transaction, true)}
                              >
                                Archive (soft delete)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deletePermanent(transaction)}
                            >
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <TransactionModal
        open={isModalOpen}
        onOpenChange={(o) => {
          setIsModalOpen(o);
          if (!o) setEditingTransaction(undefined);
        }}
        accounts={accounts}
        categoryView={categoryView}
        portId={portfolioId}
        editingTransaction={editingTransaction}
        onTransactionChange={handleTransactionUpdate}
      />
    </div>
  );
}
