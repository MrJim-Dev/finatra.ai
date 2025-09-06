'use client';

import { useEffect, useState } from 'react';

export function CookieSyncTest() {
  const [syncResult, setSyncResult] = useState<any>(null);

  const performSync = async () => {
    try {
      console.log('[CookieSyncTest] Starting cookie sync test...');

      // First, let's see what the server-side session endpoint returns
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      console.log(
        '[CookieSyncTest] Session endpoint response:',
        sessionResponse.status
      );

      const result: any = {
        timestamp: new Date().toISOString(),
        sessionEndpoint: {
          status: sessionResponse.status,
          ok: sessionResponse.ok,
          headers: Object.fromEntries(sessionResponse.headers.entries()),
        },
      };

      if (sessionResponse.ok) {
        try {
          const sessionData = await sessionResponse.json();
          result.sessionEndpoint.data = sessionData;
        } catch (e) {
          result.sessionEndpoint.parseError =
            'Could not parse session response';
        }
      }

      // Now test if we can manually sync cookies by calling the auth/me endpoint
      // after ensuring we have proper session
      const meResponse = await fetch('/finatra-api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      result.meAfterSync = {
        status: meResponse.status,
        ok: meResponse.ok,
        headers: Object.fromEntries(meResponse.headers.entries()),
      };

      if (meResponse.ok) {
        try {
          const meData = await meResponse.json();
          result.meAfterSync.data = meData;
        } catch (e) {
          result.meAfterSync.parseError = 'Could not parse me response';
        }
      } else {
        try {
          const errorText = await meResponse.text();
          result.meAfterSync.error = errorText;
        } catch (e) {
          result.meAfterSync.readError = 'Could not read error';
        }
      }

      setSyncResult(result);
      console.log('[CookieSyncTest] Sync test complete:', result);
    } catch (error) {
      setSyncResult({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    performSync();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 bg-green-900/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🔄 Cookie Sync Test</h3>
      <button
        onClick={performSync}
        className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs mb-2"
      >
        Re-test Sync
      </button>
      {syncResult && (
        <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-auto">
          {JSON.stringify(syncResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
