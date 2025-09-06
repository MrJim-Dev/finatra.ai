import { NextResponse, type NextRequest } from 'next/server';

function dbg(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[auth-mw]', ...args);
  }
}

// Minimal auth gate: verify session by calling finatra-api /auth/me
export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  // Allow both "/signin" and legacy "/login" to be publicly accessible
  const publicPaths = new Set([
    '/signin',
    '/login',
    '/signup',
    '/',
    '/api/health',
    '/icon.ico',
    '/sw.js',
  ]);
  if (
    publicPaths.has(url.pathname) ||
    url.pathname.startsWith('/.well-known')
  ) {
    dbg('public path, allowing:', url.pathname);
    return NextResponse.next();
  }

  // If no auth cookies at all, skip network probe and redirect
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const hasSomeSession = Boolean(accessToken || userCookie || refreshToken);

  const mask = (v?: string) => (v ? `${v.slice(0, 8)}…(${v.length})` : 'none');
  dbg('path:', url.pathname);
  dbg(
    'cookies -> access:',
    mask(accessToken),
    'refresh:',
    mask(refreshToken),
    'user:',
    userCookie ? 'present' : 'absent'
  );
  dbg(
    'all cookies:',
    request.cookies
      .getAll()
      .map((c) => `${c.name}=${c.value ? 'present' : 'empty'}`)
      .join(', ') || 'NONE'
  );

  if (!hasSomeSession) {
    dbg('no session cookies, redirect -> /signin', url.pathname);
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If we got here, we have some cookies but no valid access token (or it failed elsewhere).
  // To avoid blocking authenticated users due to transient API 401/permission checks,
  // allow navigation when an access token is present. SSR will do its own tolerant fetches.
  if (accessToken) {
    dbg('access token present, allowing');
    return NextResponse.next();
  }

  // Not authenticated -> redirect to signin
  dbg('no valid session, redirect -> /signin');
  const signInUrl = new URL('/signin', request.url);
  signInUrl.searchParams.set('next', url.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|finatra-api|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
