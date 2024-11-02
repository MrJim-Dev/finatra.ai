import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Transaction = {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  account: string;
};

export default function Page() {
  const currentMonth = 'Jul 2020';

  // Expanded dummy data with multiple transactions per day
  const transactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2020-07-29'),
      description: 'brunch with daniel',
      category: 'Social Life',
      amount: 34.39,
      type: 'expense',
      account: 'RBO Debit Card',
    },
    {
      id: '2',
      date: new Date('2020-07-29'),
      description: 'coffee meeting',
      category: 'Social Life',
      amount: 12.5,
      type: 'expense',
      account: 'RBO Debit Card',
    },
    {
      id: '3',
      date: new Date('2020-07-28'),
      description: 'ikea wardrobe',
      category: 'Household',
      amount: 315.48,
      type: 'expense',
      account: 'RBO Credit Card',
    },
    {
      id: '4',
      date: new Date('2020-07-28'),
      description: 'grocery shopping',
      category: 'Food',
      amount: 89.32,
      type: 'expense',
      account: 'HIBD Debit Card',
    },
    {
      id: '5',
      date: new Date('2020-07-27'),
      description: 'minimum fees',
      category: 'Transfer',
      amount: 80.0,
      type: 'expense',
      account: 'HIBD + Travel',
    },
    {
      id: '6',
      date: new Date('2020-07-24'),
      description: 'HIBD + House',
      category: 'Transfer',
      amount: 300.0,
      type: 'expense',
      account: 'HIBD',
    },
    {
      id: '7',
      date: new Date('2020-07-24'),
      description: 'Salary deposit',
      category: 'Income',
      amount: 3500.0,
      type: 'income',
      account: 'Main Account',
    },
    {
      id: '8',
      date: new Date('2020-07-22'),
      description: 'tax refunds',
      category: 'Income',
      amount: 245.0,
      type: 'income',
      account: 'Main Account',
    },
  ];

  // Group transactions by date
  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.date.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );

  // Calculate totals
  const totalIncome = 4831.89;
  const totalExpenses = 2442.93;
  const totalBalance = totalIncome - totalExpenses;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">{currentMonth}</span>
        <button className="p-2 hover:bg-muted rounded-full">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* View Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Totals */}
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

      {/* Transactions List */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions)
          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
          .map(([date, dayTransactions]) => {
            const dateObj = new Date(date);
            const dayTotal = dayTransactions.reduce(
              (sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount),
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
                  <div
                    className={`text-sm font-medium ${dayTotal >= 0 ? 'text-blue-500' : 'text-red-500'}`}
                  >
                    $ {Math.abs(dayTotal).toFixed(2)}
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
                        <span className="text-sm">
                          {transaction.description}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.category} • {transaction.account}
                        </span>
                      </div>
                      <div className="flex gap-6">
                        <span
                          className={`text-sm ${
                            transaction.type === 'income'
                              ? 'text-blue-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {transaction.type === 'income'
                            ? `$ ${transaction.amount.toFixed(2)}`
                            : '$ 0.00'}
                        </span>
                        <span
                          className={`text-sm ${
                            transaction.type === 'expense'
                              ? 'text-red-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {transaction.type === 'expense'
                            ? `$ ${transaction.amount.toFixed(2)}`
                            : '$ 0.00'}
                        </span>
                      </div>
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
