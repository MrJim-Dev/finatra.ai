import { NewGroupForm } from '@/components/new-group-form';
import { NewAccountButton } from '@/components/new-account-button';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { CategoryList } from '@/components/category-list';
import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/session';
import { getCategoryHierarchyServer } from '@/lib/api/finance';

export default async function Page({ params }: { params: { slug: string } }) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) return null;

  const [incomeHierarchy, expenseHierarchy] = await Promise.all([
    getCategoryHierarchyServer(portfolio.port_id, 'income'),
    getCategoryHierarchyServer(portfolio.port_id, 'expense'),
  ]);

  const categoryViewData = [
    { type: 'income', port_id: portfolio.port_id, categories: incomeHierarchy || [] },
    { type: 'expense', port_id: portfolio.port_id, categories: expenseHierarchy || [] },
  ];

  return <CategoryList categoryViewData={categoryViewData as any} />;
}
