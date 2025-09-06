import { TransactionsView } from '@/components/transactions-view';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

// Helper function to validate and get date from searchParams
function getDateFromParams(searchParams: { month?: string; year?: string }) {
  const today = new Date();
  const year = searchParams.year
    ? parseInt(searchParams.year)
    : today.getFullYear();
  const month = searchParams.month
    ? parseInt(searchParams.month) - 1
    : today.getMonth();

  return new Date(year, month, 1);
}

async function getTransactions(portfolioId: string, date: Date) {
  const supabase = await createClient();

  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const { data: transactions, error } = await supabase
    .from('transactions_view')
    .select('*')
    .eq('port_id', portfolioId)
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString())
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return transactions;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { month?: string; year?: string };
}) {
  const { user } = await getUser();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) return null;

  const currentDate = getDateFromParams(searchParams);

  // Get transactions for the specified month
  const transactions = await getTransactions(portfolio.port_id, currentDate);

  // Calculate totals server-side
  const totalIncome = transactions.reduce(
    (sum, t) =>
      t.transaction_type === 'income' ? sum + Number(t.amount) : sum,
    0
  );
  const totalExpenses = transactions.reduce(
    (sum, t) =>
      t.transaction_type === 'expense' ? sum + Number(t.amount) : sum,
    0
  );
  const totalBalance = totalIncome - totalExpenses;

  return (
    <TransactionsView
      portfolioId={portfolio.port_id}
      transactions={transactions}
      currentDate={currentDate}
      totals={{
        income: totalIncome,
        expenses: totalExpenses,
        balance: totalBalance,
      }}
    />
  );
}
