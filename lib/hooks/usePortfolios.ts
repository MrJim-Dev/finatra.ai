'use client';

import { useState, useEffect } from 'react';
import { getPortfoliosClient } from '../api/finance';
import { Portfolio } from '../types/portfolio';
import {
  getActivePortfolioClient,
  setActivePortfolioCookieClient,
} from '../portfolio';

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(
    null
  );

  useEffect(() => {
    async function fetchPortfolios() {
      try {
        setLoading(true);
        setError(null);

        console.log('[usePortfolios] Fetching portfolios...');
        const result = await getPortfoliosClient();

        if (result?.data && Array.isArray(result.data)) {
          setPortfolios(result.data);
          console.log(
            '[usePortfolios] Fetched portfolios:',
            result.data.length
          );

          // Set active portfolio from cookie or first portfolio
          const cookiePortfolio = getActivePortfolioClient();
          let active = null;

          if (
            cookiePortfolio &&
            result.data.find((p) => p.slug === cookiePortfolio.slug)
          ) {
            active =
              result.data.find((p) => p.slug === cookiePortfolio.slug) || null;
          } else if (result.data.length > 0) {
            active = result.data[0];
          }

          if (active) {
            setActivePortfolio(active);
            setActivePortfolioCookieClient(active);
          }
        } else {
          console.warn('[usePortfolios] No portfolios data received');
          setPortfolios([]);
        }
      } catch (err) {
        console.error('[usePortfolios] Error fetching portfolios:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch portfolios'
        );

        // Try to use cached portfolio as fallback
        const cookiePortfolio = getActivePortfolioClient();
        if (cookiePortfolio) {
          setPortfolios([cookiePortfolio]);
          setActivePortfolio(cookiePortfolio);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolios();
  }, []);

  const selectPortfolio = (portfolio: Portfolio) => {
    setActivePortfolio(portfolio);
    setActivePortfolioCookieClient(portfolio);
  };

  return {
    portfolios,
    activePortfolio,
    loading,
    error,
    selectPortfolio,
    refetch: () => {
      setLoading(true);
      // Re-trigger the useEffect
      window.location.reload();
    },
  };
}
