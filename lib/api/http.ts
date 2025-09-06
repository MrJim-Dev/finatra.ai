export type ApiOptions = RequestInit & { skipAuth?: boolean };

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

// Client-side cookie reading utility
function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  // Note: We rely on httpOnly cookies being sent automatically via credentials: 'include'
  // The access_token cookie is httpOnly for security and not accessible via JavaScript
  try {
    console.log(
      '[apiFetch] ->',
      options.method || 'GET',
      url,
      'credentials: include',
      'skipAuth:',
      !!options.skipAuth,
      'document.cookie:',
      typeof document !== 'undefined' ? `"${document.cookie}"` : 'server-side'
    );
  } catch {}

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
      try {
        console.warn('[apiFetch] skipAuth unauthorized ->', res.status, url);
      } catch {}
      return undefined as unknown as T;
    }
    let message = `Request failed ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    try {
      console.error('[apiFetch] error ->', res.status, url, message);
    } catch {}
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
  try {
    console.log(
      '[apiFetchServer] ->',
      options.method || 'GET',
      url,
      'auth:',
      !!access
    );
  } catch {}
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
      try {
        console.warn(
          '[apiFetchServer] skipAuth unauthorized ->',
          res.status,
          url
        );
      } catch {}
      return undefined as unknown as T;
    }
    let message = `Request failed ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    try {
      console.error('[apiFetchServer] error ->', res.status, url, message);
    } catch {}
    throw new Error(message);
  }
  try {
    console.log('[apiFetchServer] <-', res.status, url);
  } catch {}

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}
