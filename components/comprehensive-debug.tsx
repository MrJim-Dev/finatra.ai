'use client';

import { useEffect, useState } from 'react';

export function ComprehensiveDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function runTests() {
      const results: any = {
        timestamp: new Date().toISOString(),
        location: {
          origin: window.location.origin,
          hostname: window.location.hostname,
          port: window.location.port,
          pathname: window.location.pathname,
        },
        cookies: {
          document: document.cookie,
          parsed: {},
        },
      };

      // Parse cookies
      if (document.cookie) {
        document.cookie.split(';').forEach((cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            results.cookies.parsed[key] = decodeURIComponent(value);
          }
        });
      }

      // Test API endpoints with different approaches
      const tests = [
        {
          name: 'auth_me_default',
          url: '/finatra-api/auth/me',
          options: { method: 'GET', credentials: 'include' },
        },
        {
          name: 'auth_me_no_credentials',
          url: '/finatra-api/auth/me',
          options: { method: 'GET' },
        },
        {
          name: 'portfolios_default',
          url: '/finatra-api/portfolios',
          options: { method: 'GET', credentials: 'include' },
        },
        {
          name: 'portfolios_with_headers',
          url: '/finatra-api/portfolios',
          options: {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
          },
        },
      ];

      results.apiTests = {};

      for (const test of tests) {
        try {
          console.log(`[ComprehensiveDebug] Testing ${test.name}...`);
          const response = await fetch(test.url, test.options);

          results.apiTests[test.name] = {
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            hasSetCookie: response.headers.has('set-cookie'),
            cookies: response.headers.get('set-cookie'),
          };

          if (response.ok) {
            try {
              const data = await response.json();
              results.apiTests[test.name].data = data;
            } catch (e) {
              results.apiTests[test.name].parseError = 'Could not parse JSON';
            }
          } else {
            try {
              const error = await response.text();
              results.apiTests[test.name].error = error;
            } catch (e) {
              results.apiTests[test.name].readError = 'Could not read error';
            }
          }
        } catch (error) {
          results.apiTests[test.name] = {
            fetchError: error instanceof Error ? error.message : String(error),
          };
        }
      }

      setDebugInfo(results);
    }

    runTests();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-1/2 left-4 transform -translate-y-1/2 bg-purple-900/95 text-white p-4 rounded-lg text-xs max-w-lg max-h-96 overflow-auto z-50">
      <h3 className="font-bold mb-2 text-yellow-300">🔍 Comprehensive Debug</h3>
      {debugInfo ? (
        <pre className="whitespace-pre-wrap text-[10px]">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      ) : (
        <p>Running tests...</p>
      )}
    </div>
  );
}
