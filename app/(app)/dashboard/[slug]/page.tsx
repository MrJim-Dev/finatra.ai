import { TransactionsView } from '@/components/transactions-view';
import { getPortfolioBySlug } from '@/lib/portfolio';

export default async function Page({ params }: { params: { slug: string } }) {
  // Get portfolio data
  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) return null;

  return <TransactionsView portfolioId={portfolio.port_id} />;
}
