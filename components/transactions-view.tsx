'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TransactionModal } from '@/components/transaction-modal';
import type { Account, CategoryView } from '@/types';
import {
  getTransactionsAuthenticated,
  getAccountsByPortfolioAuthenticated,
  getCategoryHierarchyAuthenticated,
} from '@/lib/api/auth-proxy';

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
  category: string;
  portfolio: {
    portfolio_id: string;
    portfolio_title: string;
    portfolio_icon: string;
  };
}

interface TransactionViewProps {
  portfolioId: string;
}

export function TransactionsView({ portfolioId }: TransactionViewProps) {
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

  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.transaction_date.split('T')[0];
      if (!groups[date]) {
        groups[date] = [] as Transaction[];
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

  const fetchTransactions = async () => {
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    try {
      const res = await getTransactionsAuthenticated({
        port_id: portfolioId,
        date_from: startOfMonth.toISOString(),
        date_to: endOfMonth.toISOString(),
        limit: 500,
      });

      const monthTransactions = (res?.data || []).map(
        (t: any) =>
          ({
            id: t.id,
            transaction_id: t.transaction_id,
            transaction_date: t.transaction_date,
            amount: t.amount,
            transaction_type: t.transaction_type,
            note: t.note,
            description: t.description,
            account: {
              account_id: t.account_id,
              account_name: t.account_name || '',
              account_description: '',
            },
            category: t.category,
            portfolio: {
              portfolio_id: t.port_id,
              portfolio_title: '',
              portfolio_icon: '',
            },
          }) as Transaction
      );

      setTransactions(monthTransactions);

      const income = monthTransactions.reduce(
        (sum: number, t: Transaction) =>
          t.transaction_type === 'income' ? sum + Number(t.amount) : sum,
        0
      );
      const expenses = monthTransactions.reduce(
        (sum: number, t: Transaction) =>
          t.transaction_type === 'expense' ? sum + Number(t.amount) : sum,
        0
      );
      setTotalIncome(income);
      setTotalExpenses(expenses);
      setTotalBalance(income - expenses);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchAccountsAndCategories = async () => {
    try {
      const { data: accountsData } =
        await getAccountsByPortfolioAuthenticated(portfolioId);
      if (accountsData) setAccounts(accountsData as any);

      const [incomeHierarchy, expenseHierarchy] = await Promise.all([
        getCategoryHierarchyAuthenticated(portfolioId, 'income'),
        getCategoryHierarchyAuthenticated(portfolioId, 'expense'),
      ]);

      const categoriesFormatted = [
        {
          type: 'income',
          port_id: portfolioId,
          categories: (incomeHierarchy as any) || [],
        },
        {
          type: 'expense',
          port_id: portfolioId,
          categories: (expenseHierarchy as any) || [],
        },
      ];
      setCategoryView(categoriesFormatted as any);
    } catch (error) {
      console.error('Error fetching accounts/categories:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccountsAndCategories();
  }, [currentDate, portfolioId]);

  const handleTransactionClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
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

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex justify-between py-3 px-4 bg-muted/30 rounded-lg">
        <div className="text-sm">
          <span className="text-muted-foreground">Income</span>
          <div className="text-blue-500 font-medium">
            $ {totalIncome.toFixed(2)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Expenses</span>
          <div className="text-red-500 font-medium">
            $ {totalExpenses.toFixed(2)}
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Total</span>
          <div className="font-medium">$ {totalBalance.toFixed(2)}</div>
        </div>
      </div>

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

                <div className="space-y-1">
                  {dayTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-2 px-4 bg-card rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {transaction.note}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.category} •{' '}
                          {transaction.account.account_name}
                          {transaction.description && (
                            <span className="ml-1">
                              • {transaction.description}
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-medium ${transaction.transaction_type === 'expense' ? 'text-red-500' : 'text-blue-500'}`}
                      >
                        {transaction.transaction_type === 'expense' ? '-' : '+'}{' '}
                        ${Number(transaction.amount).toFixed(2)}
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
        onOpenChange={setIsModalOpen}
        accounts={accounts}
        categoryView={categoryView}
        portId={portfolioId}
        editingTransaction={editingTransaction}
        onTransactionChange={fetchTransactions}
      />
    </div>
  );
}
