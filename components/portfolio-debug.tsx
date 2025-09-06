'use client';

import { useState, useEffect } from 'react';
import { getPortfoliosClient } from '@/lib/api/finance';
import { getActivePortfolioClient } from '@/lib/portfolio';
import {
  getPortfoliosAuthenticated,
  getAuthMeAuthenticated,
} from '@/lib/api/auth-proxy';

export function PortfolioDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function debug() {
      try {
        // Get auth info
        const getCookieValue = (name: string): string | undefined => {
          if (typeof document === 'undefined') return undefined;
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
              return decodeURIComponent(value);
            }
          }
          return undefined;
        };

        const accessToken = getCookieValue('access_token');
        const refreshToken = getCookieValue('refresh_token');
        const userCookie = getCookieValue('user');

        // Test cookie access and document.cookie content
        const allCookies =
          typeof document !== 'undefined' ? document.cookie : 'server-side';
        const authTest = {
          documentCookies: allCookies,
          cookiesEnabled: !!accessToken,
          tokenPresent: !!accessToken,
          tokenLength: accessToken?.length || 0,
          allCookieNames: allCookies
            ? allCookies.split(';').map((c) => c.trim().split('=')[0])
            : [],
        };

        // Test both old and new authentication methods
        const [oldPortfolios, newPortfolios, authMe, sessionStatus] =
          await Promise.allSettled([
            getPortfoliosClient().catch((e) => ({ error: e.message })),
            getPortfoliosAuthenticated().catch((e) => ({ error: e.message })),
            getAuthMeAuthenticated().catch((e) => ({ error: e.message })),
            fetch('/api/auth/session')
              .then((r) => r.json())
              .catch((e) => ({ error: e.message })),
          ]);

        const cookie = getActivePortfolioClient();

        setDebugInfo({
          auth: {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasUserCookie: !!userCookie,
            accessTokenLength: accessToken?.length || 0,
          },
          authTest,
          sessionStatus:
            sessionStatus.status === 'fulfilled'
              ? sessionStatus.value
              : { error: sessionStatus.reason?.message },
          authMe:
            authMe.status === 'fulfilled'
              ? authMe.value
              : { error: authMe.reason?.message },
          portfolios: {
            old:
              oldPortfolios.status === 'fulfilled'
                ? oldPortfolios.value
                : { error: oldPortfolios.reason?.message },
            new:
              newPortfolios.status === 'fulfilled'
                ? newPortfolios.value
                : { error: newPortfolios.reason?.message },
          },
          cookie,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const getCookieValue = (name: string): string | undefined => {
          if (typeof document === 'undefined') return undefined;
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
              return decodeURIComponent(value);
            }
          }
          return undefined;
        };

        const accessToken = getCookieValue('access_token');
        const refreshToken = getCookieValue('refresh_token');
        const userCookie = getCookieValue('user');

        // Test cookie access and document.cookie content even on error
        const allCookies =
          typeof document !== 'undefined' ? document.cookie : 'server-side';
        const authTest = {
          documentCookies: allCookies,
          cookiesEnabled: !!accessToken,
          tokenPresent: !!accessToken,
          tokenLength: accessToken?.length || 0,
          allCookieNames: allCookies
            ? allCookies.split(';').map((c) => c.trim().split('=')[0])
            : [],
        };

        setDebugInfo({
          auth: {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasUserCookie: !!userCookie,
            accessTokenLength: accessToken?.length || 0,
          },
          authTest,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    debug();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Portfolio Debug</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
