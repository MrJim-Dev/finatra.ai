'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  note: string;
  description: string;
  account: {
    account_id: string;
    account_name: string;
    account_description: string;
  };
  category: {
    category_id: string;
    category_name: string;
    category_type: string;
    parent_category_id: string;
    parent_category_name: string;
    category_path: string;
  };
  portfolio: {
    portfolio_id: string;
    portfolio_title: string;
    portfolio_icon: string;
  };
}

interface TransactionViewProps {
  portfolioId: string;
  transactions: Transaction[];
  currentDate: Date;
  totals: {
    income: number;
    expenses: number;
    balance: number;
  };
}

export function TransactionsView({
  portfolioId,
  transactions,
  currentDate,
  totals,
}: TransactionViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Group transactions by date
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

  const handlePreviousMonth = () => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1
    );
    const params = new URLSearchParams(searchParams);
    params.set('month', String(newDate.getMonth() + 1));
    params.set('year', String(newDate.getFullYear()));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleNextMonth = () => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    );
    const params = new URLSearchParams(searchParams);
    params.set('month', String(newDate.getMonth() + 1));
    params.set('year', String(newDate.getFullYear()));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">{currentMonth}</span>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* View Tabs - restored from old version */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Totals - restored old styling */}
      <div className="flex justify-between py-3 px-4 bg-muted/30 rounded-lg">
        <div className="text-sm">
          <span className="text-muted-foreground">Income</span>
          <div className="text-blue-500 font-medium">
            $ {totals.income.toFixed(2)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Expenses</span>
          <div className="text-red-500 font-medium">
            $ {totals.expenses.toFixed(2)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Total</span>
          <div className="font-medium">$ {totals.balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions)
          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
          .map(([date, dayTransactions]) => {
            const dateObj = new Date(date);
            const dayTotal = dayTransactions.reduce(
              (sum: number, t: Transaction) =>
                sum +
                (t.transaction_type === 'expense'
                  ? -Number(t.amount)
                  : Number(t.amount)),
              0
            );
            const dayExpenses = dayTransactions.reduce(
              (sum: number, t: Transaction) =>
                t.transaction_type === 'expense' ? sum + Number(t.amount) : sum,
              0
            );

            return (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">
                      {dateObj.getDate()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
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
                      $ {Math.abs(dayTotal).toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      $ {dayExpenses.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Day's Transactions */}
                <div className="space-y-1">
                  {dayTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-2 px-4 bg-card rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {transaction.note}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.category.category_path} •{' '}
                          {transaction.account.account_name}
                          {transaction.description && (
                            <span className="ml-1">
                              • {transaction.description}
                            </span>
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          transaction.transaction_type === 'income'
                            ? 'text-blue-500'
                            : transaction.transaction_type === 'expense'
                              ? 'text-red-500'
                              : 'text-muted-foreground'
                        }`}
                      >
                        $ {Number(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
