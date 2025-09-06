export type ApiOptions = RequestInit & { skipAuth?: boolean };

// Dev-only logger
function dbg(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[http]', ...args);
  }
}

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_FINATRA_API_URL || process.env.FINATRA_API_URL;
  // In the browser, prefer the Next.js proxy path to avoid cross-origin cookie issues.
  if (typeof window !== 'undefined') {
    return '/finatra-api';
  }
  // On the server/middleware, use the configured API URL, else proxy path
  if (envUrl) return envUrl.replace(/\/$/, '');
  return '/finatra-api';
}

// Client-side cookie reading utility (rarely needed; httpOnly cookies not accessible)
function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return undefined;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  // Enhanced client-side logging with warnings for direct API calls
  if (process.env.NODE_ENV === 'development') {
    const allCookies = typeof document !== 'undefined' ? document.cookie : '';
    const cookieNames = allCookies
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter(Boolean);
    const isDirectApiCall =
      base.includes('localhost:3333') || base.includes('finatra-api');
    const needsAuth = !options.skipAuth;

    if (isDirectApiCall && needsAuth && typeof window !== 'undefined') {
      console.warn(
        `⚠️  [http] Direct API call requiring auth detected: ${url}`,
        '\n  🔧 Recommendation: Use auth proxy (/api/auth/proxy) for client-side authenticated requests',
        '\n  📝 HttpOnly cookies cannot be accessed by client JS for security',
        '\n  🔄 This request may fail with 401 if finatra-api requires Authorization header'
      );
    }

    dbg('client ->', options.method || 'GET', url, {
      skipAuth: !!options.skipAuth,
      cookieCount: cookieNames.length,
      cookieNames: cookieNames,
      isDirectApiCall,
      needsAuth,
      warning:
        isDirectApiCall && needsAuth
          ? 'Use auth proxy for authenticated requests'
          : null,
    });
  } else {
    dbg(
      'client ->',
      options.method || 'GET',
      url,
      'skipAuth:',
      !!options.skipAuth
    );
  }

  const res = await fetch(url, {
    credentials: 'include', // This sends httpOnly cookies automatically
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    if (options.skipAuth && (res.status === 401 || res.status === 403)) {
      dbg('client skipAuth unauthorized <-', res.status, url);
      return undefined as unknown as T;
    }
    let message = `Request failed ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}

    // Enhanced error logging for client-side authentication issues
    if (res.status === 401) {
      if (process.env.NODE_ENV === 'development') {
        dbg('client auth error <-', res.status, url, {
          error: message,
          note: 'Client-side 401 error - httpOnly cookies may not be sent or token may be invalid',
          recommendation:
            'Use auth proxy (/api/auth/proxy) for authenticated client-side requests',
          cookies:
            typeof document !== 'undefined' ? document.cookie : 'server-side',
        });
      } else {
        dbg(
          'client auth error <-',
          res.status,
          url,
          message,
          '(use auth proxy for client auth)'
        );
      }
    } else {
      dbg('client error <-', res.status, url, message);
    }
    throw new Error(message);
  }

  // Handle empty bodies
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}

// Server-side fetch that forwards incoming cookies
export async function apiFetchServer<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const base = getBaseUrl();
  // Lazy import to avoid client bundle pulling next/headers
  const { cookies } = await import('next/headers');
  const cookieHeader = cookies()
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
  const access = cookies().get('access_token')?.value;
  const url = `${base}${path}`;

  // Enhanced logging for token debugging
  if (process.env.NODE_ENV === 'development') {
    const allCookies = cookies().getAll();
    const authCookies = allCookies.filter(
      (c) =>
        c.name === 'access_token' ||
        c.name === 'refresh_token' ||
        c.name === 'user'
    );

    dbg('ssr ->', options.method || 'GET', url, {
      hasAccessToken: !!access,
      accessTokenLength: access?.length || 0,
      accessTokenPrefix: access ? access.substring(0, 10) + '...' : 'undefined',
      authCookiesCount: authCookies.length,
      authCookieNames: authCookies.map((c) => c.name),
      totalCookies: allCookies.length,
    });
  } else {
    dbg('ssr ->', options.method || 'GET', url, 'auth:', !!access);
  }

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    if (options.skipAuth && (res.status === 401 || res.status === 403)) {
      dbg('ssr skipAuth unauthorized <-', res.status, url);
      return undefined as unknown as T;
    }
    let message = `Request failed ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}

    // Enhanced error logging for authentication issues
    if (res.status === 401) {
      if (process.env.NODE_ENV === 'development') {
        dbg('ssr auth error <-', res.status, url, {
          error: message,
          tokenStatus: {
            hasAccessToken: !!access,
            tokenLength: access?.length || 0,
            tokenType: access ? typeof access : 'undefined',
            tokenEmpty: access === '',
            tokenUndefined: access === undefined,
            tokenNull: access === null,
          },
          cookieHeaderLength: cookieHeader.length,
          hasCookieHeader: !!cookieHeader,
        });
      } else {
        dbg(
          'ssr auth error <-',
          res.status,
          url,
          message,
          'token:',
          access ? 'present' : 'missing'
        );
      }
    } else {
      dbg('ssr error <-', res.status, url, message);
    }
    throw new Error(message);
  }
  dbg('ssr <-', res.status, url);

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}
