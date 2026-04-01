'use client';

import * as React from 'react';
import {
  DEFAULT_CURRENCY_FALLBACK,
  normalizeCurrencyCode,
} from '@/lib/format-money';

const PortfolioCurrencyContext = React.createContext<string>(
  DEFAULT_CURRENCY_FALLBACK
);

export function PortfolioCurrencyProvider({
  currency,
  children,
}: {
  /** From `portfolio.default_currency` (Settings → default currency). */
  currency: string | null | undefined;
  children: React.ReactNode;
}) {
  const value = normalizeCurrencyCode(currency);
  return (
    <PortfolioCurrencyContext.Provider value={value}>
      {children}
    </PortfolioCurrencyContext.Provider>
  );
}

/** Portfolio default ISO currency for this `/dashboard/[slug]` tree. */
export function usePortfolioCurrency(): string {
  return React.useContext(PortfolioCurrencyContext);
}
