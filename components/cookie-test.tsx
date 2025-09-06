'use client';

import { useEffect, useState } from 'react';

export function CookieTest() {
  const [cookieInfo, setCookieInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const allCookies = document.cookie;
      const cookieArray = allCookies ? allCookies.split(';') : [];
      const cookieObj: Record<string, string> = {};

      cookieArray.forEach((cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          cookieObj[key] = decodeURIComponent(value);
        }
      });

      setCookieInfo({
        raw: allCookies,
        parsed: cookieObj,
        count: cookieArray.length,
        hasAccessToken: 'access_token' in cookieObj,
        hasRefreshToken: 'refresh_token' in cookieObj,
        hasUser: 'user' in cookieObj,
        keys: Object.keys(cookieObj),
      });
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Cookie Test</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(cookieInfo, null, 2)}
      </pre>
    </div>
  );
}
