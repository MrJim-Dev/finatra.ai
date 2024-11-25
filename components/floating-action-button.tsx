'use client';

import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { TransactionModal } from './transaction-modal';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      // First get the port_id from the slug
      const portfolio = await getPortfolioBySlug(slug);

      if (!portfolio) {
        console.error('Error fetching portfolio');
        return;
      }

      const currentPortId = portfolio.port_id;
      setPortId(currentPortId);

      // Fetch accounts for this port_id
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('port_id', currentPortId);

      console.log(accountsData, accountsError);

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        return;
      }

      // Fetch categories for this port_id
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('category_view')
        .select('*')
        .eq('port_id', currentPortId);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return;
      }

      setAccounts(accountsData || []);
      setCategoryView(categoriesData || []);
    }

    if (slug) {
      fetchData();
    }
  }, [supabase, slug]);

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
