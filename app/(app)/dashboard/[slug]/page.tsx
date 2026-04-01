import { TransactionsView } from '@/components/transactions-view';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

export default async function Page({ params }: { params: { slug: string } }) {
  const { user } = await getUser();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) {
    notFound();
  }

  return <TransactionsView portfolioId={portfolio.port_id} />;
}
