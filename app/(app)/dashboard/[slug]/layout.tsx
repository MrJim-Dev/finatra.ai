import type { ReactNode } from 'react';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { PortfolioCurrencyProvider } from '@/components/context/portfolio-currency-context';

export default async function DashboardSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const portfolio = await getPortfolioBySlug(params.slug);
  return (
    <PortfolioCurrencyProvider currency={portfolio?.default_currency}>
      {children}
    </PortfolioCurrencyProvider>
  );
}
