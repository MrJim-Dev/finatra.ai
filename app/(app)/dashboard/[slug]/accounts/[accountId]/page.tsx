import { AccountActivityView } from '@/components/account-activity-view';
import { createClient, getUser } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { redirect, notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { slug: string; accountId: string };
}) {
  const { user } = await getUser();
  if (!user) {
    redirect('/signin');
  }

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) {
    notFound();
  }

  const supabase = await createClient();
  const { data: acc, error } = await supabase
    .from('accounts')
    .select('account_id, name, in_total, currency')
    .eq('account_id', params.accountId)
    .eq('port_id', portfolio.port_id)
    .maybeSingle();

  if (error || !acc) {
    notFound();
  }

  const includedInPortfolioTotals = acc.in_total !== false;

  return (
    <AccountActivityView
      portfolioId={portfolio.port_id}
      accountId={acc.account_id}
      slug={params.slug}
      accountName={acc.name}
      includedInPortfolioTotals={includedInPortfolioTotals}
      accountCurrency={acc.currency ?? null}
    />
  );
}
