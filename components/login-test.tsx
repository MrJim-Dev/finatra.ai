'use client';

import { useState } from 'react';

export function LoginTest() {
  const [loginResult, setLoginResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      console.log('[LoginTest] Attempting login...');

      // Try to login with test credentials
      const response = await fetch('/finatra-api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'mrjim.development@gmail.com', // Use the email from logs
          password: 'password123', // Common test password
        }),
      });

      console.log(
        '[LoginTest] Login response:',
        response.status,
        response.statusText
      );

      const result = {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        setCookieHeaders: response.headers.get('set-cookie'),
      };

      if (response.ok) {
        const data = await response.json();
        result.data = data;
        console.log('[LoginTest] Login successful:', data);

        // Check cookies after login
        setTimeout(() => {
          console.log('[LoginTest] Cookies after login:', document.cookie);
        }, 100);
      } else {
        const error = await response.text();
        result.error = error;
        console.log('[LoginTest] Login failed:', error);
      }

      setLoginResult(result);
    } catch (error) {
      console.error('[LoginTest] Login error:', error);
      setLoginResult({
        error: error instanceof Error ? error.message : String(error),
        type: 'fetch_error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-900/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Login Test</h3>
      <button
        onClick={testLogin}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs mb-2 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Test Login'}
      </button>
      {loginResult && (
        <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-auto">
          {JSON.stringify(loginResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
