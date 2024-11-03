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

  // Updated dummy data with multi-level nesting
  const categoryGroups = [
    {
      group_id: '1',
      group_name: 'Income',
      categories: [
        {
          category_id: '1',
          name: 'Salary',
          subcategories: [
            {
              category_id: '1-1',
              name: 'Base Pay',
              subcategories: [
                { category_id: '1-1-1', name: 'Regular Hours' },
                { category_id: '1-1-2', name: 'Overtime' },
              ],
            },
            { category_id: '1-2', name: 'Bonus' },
          ],
        },
        {
          category_id: '2',
          name: 'Investments',
          subcategories: [
            {
              category_id: '2-1',
              name: 'Dividends',
              subcategories: [
                { category_id: '2-1-1', name: 'Stocks' },
                { category_id: '2-1-2', name: 'ETFs' },
              ],
            },
            { category_id: '2-2', name: 'Interest' },
          ],
        },
      ],
    },
    {
      group_id: '2',
      group_name: 'Expenses',
      categories: [
        {
          category_id: '3',
          name: 'Housing',
          subcategories: [
            { category_id: '3-1', name: 'Rent' },
            { category_id: '3-2', name: 'Utilities' },
          ],
        },
        {
          category_id: '4',
          name: 'Transportation',
          subcategories: [
            { category_id: '4-1', name: 'Gas' },
            { category_id: '4-2', name: 'Maintenance' },
          ],
        },
      ],
    },
  ];

  return <CategoryList categoryGroups={categoryGroups} />;
}
