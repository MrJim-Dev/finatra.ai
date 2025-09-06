'use client';

import { useEffect, useState } from 'react';
import {
  getPortfoliosAuthenticated,
  getAuthMeAuthenticated,
} from '@/lib/api/auth-proxy';

export function AuthTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshAuth = async () => {
    try {
      console.log('[AuthTest] Attempting to refresh authentication...');
      const refreshResponse = await fetch(
        '/api/auth/proxy?path=%2Fauth%2Frefresh',
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (refreshResponse.ok) {
        console.log('[AuthTest] Authentication refreshed successfully');
        // Run the test again to verify
        runTest();
      } else {
        console.error(
          '[AuthTest] Failed to refresh authentication:',
          refreshResponse.status
        );
        // Force logout and redirect to login
        await forceLogout();
      }
    } catch (error) {
      console.error('[AuthTest] Refresh error:', error);
      await forceLogout();
    }
  };

  const forceLogout = async () => {
    try {
      console.log('[AuthTest] Forcing logout due to invalid tokens...');

      // Call logout endpoint to clear server-side cookies
      await fetch('/api/auth/proxy?path=%2Fauth%2Flogout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear client-side cookies as well
      document.cookie =
        'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie =
        'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie =
        'active_portfolio=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      console.log('[AuthTest] Cookies cleared, redirecting to login...');
      window.location.href = '/login';
    } catch (error) {
      console.error('[AuthTest] Force logout error:', error);
      // Still redirect even if logout fails
      window.location.href = '/login';
    }
  };

  const runTest = async () => {
    setLoading(true);
    try {
      console.log('[AuthTest] Running authenticated API tests...');

      const results: any = {
        timestamp: new Date().toISOString(),
      };

      // Test session endpoint
      try {
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = sessionResponse.ok
          ? await sessionResponse.json()
          : await sessionResponse.text();

        results.session = {
          status: sessionResponse.status,
          ok: sessionResponse.ok,
          data: sessionData,
        };

        // Check if we need to re-authenticate
        if (sessionData?.needsReauth) {
          console.log('[AuthTest] Token validation failed, forcing logout...');
          await forceLogout();
          return;
        }
      } catch (e) {
        results.session = { error: e instanceof Error ? e.message : String(e) };
      }

      // Test authenticated auth/me
      try {
        const authMe = await getAuthMeAuthenticated();
        results.authMe = { success: true, data: authMe };
      } catch (e) {
        results.authMe = { error: e instanceof Error ? e.message : String(e) };
      }

      // Test authenticated portfolios
      try {
        const portfolios = await getPortfoliosAuthenticated();
        results.portfolios = { success: true, data: portfolios };
      } catch (e) {
        results.portfolios = {
          error: e instanceof Error ? e.message : String(e),
        };
      }

      setTestResult(results);
      console.log('[AuthTest] Test results:', results);
    } catch (error) {
      setTestResult({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Show minimal status indicator
  const isWorking =
    testResult?.session?.ok &&
    testResult?.authMe?.success &&
    testResult?.portfolios?.success;
  const portfolioCount = testResult?.portfolios?.data?.data?.length || 0;

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-xs z-50 flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-400' : 'bg-red-400'}`}
      />
      <span>
        {isWorking
          ? `Auth: Working (${portfolioCount} portfolios)`
          : `Auth: Issues ${testResult?.session?.ok ? '(Session OK)' : '(Session Failed)'}`}
      </span>
      <button
        onClick={runTest}
        disabled={loading}
        className="text-blue-300 hover:text-blue-100 underline disabled:opacity-50"
      >
        {loading ? '...' : 'test'}
      </button>
      {!isWorking && (
        <>
          <button
            onClick={refreshAuth}
            disabled={loading}
            className="text-yellow-300 hover:text-yellow-100 underline disabled:opacity-50"
          >
            refresh
          </button>
          <button
            onClick={forceLogout}
            disabled={loading}
            className="text-red-300 hover:text-red-100 underline disabled:opacity-50"
          >
            logout
          </button>
        </>
      )}
    </div>
  );
}
