import { createClient, getUser } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { CategoryList } from '@/components/category-list';
import { redirect, notFound } from 'next/navigation';

export default async function Page({ params }: { params: { slug: string } }) {
  const { user } = await getUser();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) {
    notFound();
  }

  const supabase = await createClient();

  const { data: categoryViewData, error } = await supabase
    .from('category_view')
    .select('*')
    .eq('port_id', portfolio.port_id);

  if (error) {
    console.error('Error fetching categories:', error);
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Could not load categories.
      </div>
    );
  }

  return (
    <CategoryList categoryViewData={categoryViewData ?? []} />
  );
}
