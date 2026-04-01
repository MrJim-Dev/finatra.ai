import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { PortfolioSettingsShell } from '@/components/settings/portfolio-settings-shell';

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { tab?: string };
}) {
  const { user } = await getUser();
  if (!user) redirect('/signin');

  const portfolio = await getPortfolioBySlug(params.slug);
  if (!portfolio) notFound();

  const initialTab =
    searchParams?.tab === 'accounts' ? 'accounts' : undefined;

  return (
    <PortfolioSettingsShell
      portfolio={{
        port_id: portfolio.port_id,
        slug: portfolio.slug ?? params.slug,
        title: portfolio.title ?? 'Portfolio',
        default_currency: portfolio.default_currency ?? 'USD',
        color: portfolio.color ?? null,
      }}
      initialTab={initialTab}
    />
  );
}
