'use client';

import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { TransactionModal } from './transaction-modal';
import {
  getAccountsByPortfolioAuthenticated,
  getCategoryHierarchyAuthenticated,
} from '@/lib/api/auth-proxy';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { useParams } from 'next/navigation';

type Account = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  account_id: string;
  group_id: string;
  description: string;
  amount: number;
  in_total: boolean;
  hidden: boolean;
  port_id: string;
};

type CategoryView = {
  type: 'income' | 'expense';
  port_id: string;
  categories: any[];
};

export function FloatingActionButton({ className }: { className?: string }) {
  const params = useParams();
  const slug = params.slug as string;
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryView, setCategoryView] = useState<CategoryView[]>([]);
  const [portId, setPortId] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        // First get the port_id from the slug
        const portfolio = await getPortfolioBySlug(slug);

        if (!portfolio) {
          console.error('Error fetching portfolio');
          return;
        }

        const currentPortId = portfolio.port_id;
        setPortId(currentPortId);

        // Fetch accounts for this port_id
        const { data: accountsData } =
          await getAccountsByPortfolioAuthenticated(currentPortId);

        // Fetch categories for this port_id
        const [income, expense] = await Promise.all([
          getCategoryHierarchyAuthenticated(currentPortId, 'income'),
          getCategoryHierarchyAuthenticated(currentPortId, 'expense'),
        ]);

        const categoriesData: CategoryView[] = [
          {
            type: 'income',
            port_id: currentPortId,
            categories: (income as any) || [],
          },
          {
            type: 'expense',
            port_id: currentPortId,
            categories: (expense as any) || [],
          },
        ];

        setAccounts(accountsData || []);
        setCategoryView(categoriesData || []);
      } catch (err) {
        console.error('Failed to fetch FAB data', err);
      }
    }

    if (slug) {
      fetchData();
    }
  }, [slug]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg',
          'hover:scale-105 transition-transform',
          className
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TransactionModal
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        categoryView={categoryView}
        portId={portId}
      />
    </>
  );
}
