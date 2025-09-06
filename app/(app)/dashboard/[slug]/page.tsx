import { TransactionsView } from '@/components/transactions-view';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/session';

export default async function Page({ params }: { params: { slug: string } }) {
  const user = await getCurrentUserServer();
  console.log('Dashboard [slug]', user);
  // if (!user) {
  //   redirect('/signin');
  // }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) return null;

  return <TransactionsView portfolioId={portfolio.port_id} />;
}
