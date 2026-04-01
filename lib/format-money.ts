/** When account/transaction has no ISO code, use portfolio default from settings. */
export const DEFAULT_CURRENCY_FALLBACK = 'USD';

/**
 * Normalize user or DB input to a 3-letter ISO code for Intl; invalid → fallback.
 */
export function normalizeCurrencyCode(
  code: string | null | undefined
): string {
  const c = (code ?? '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3);
  return c.length === 3 ? c : DEFAULT_CURRENCY_FALLBACK;
}

/**
 * Format a numeric amount with proper symbol/placement for the ISO currency.
 */
export function formatMoneyAmount(
  amount: number,
  currencyCode: string | null | undefined
): string {
  const cur = normalizeCurrencyCode(currencyCode);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
