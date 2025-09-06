'use client';

import { useEffect, useState } from 'react';

export function AuthDebug() {
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if we can access the /auth/me endpoint
        const response = await fetch('/finatra-api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        const result = {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
        };

        if (response.ok) {
          const data = await response.json();
          result.data = data;
        } else {
          const error = await response.text();
          result.error = error;
        }

        setAuthStatus(result);
      } catch (error) {
        setAuthStatus({
          error: error instanceof Error ? error.message : String(error),
          type: 'fetch_error',
        });
      }
    }

    checkAuth();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 bg-red-900/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Auth Status Debug</h3>
      <pre className="whitespace-pre-wrap text-[10px]">
        {JSON.stringify(authStatus, null, 2)}
      </pre>
    </div>
  );
}
