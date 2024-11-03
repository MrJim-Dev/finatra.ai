import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';
import { NewGroupForm } from '@/components/new-group-form';
import { NewAccountButton } from '@/components/new-account-button';
import { createClient } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { CategoryList } from '@/components/category-list';

// Updated types for categories
type Category = {
  category_id: string;
  name: string;
  subcategories?: Category[];
  description?: string;
  created_at: string;
};

type CategoryGroup = {
  group_id: string;
  group_name: string;
  categories: Category[];
};

export default async function Page({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const portfolio = await getPortfolioBySlug(params.slug);

  const { data: categoryViewData, error } = await supabase
    .from('category_view')
    .select('*');

  if (error) {
    console.error('Error fetching categories:', error);
    return null;
  }

  return <CategoryList categoryViewData={categoryViewData} />;
}
