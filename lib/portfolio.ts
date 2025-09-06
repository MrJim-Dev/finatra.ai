import { getPortfoliosClient, getPortfolioBySlugClient } from './api/finance';

// Cookie helpers for active portfolio selection
const ACTIVE_PORT_COOKIE = 'active_portfolio';

function readCookieClient(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [k, ...rest] = c.split('=');
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function getActivePortfolioClient(): any | null {
  try {
    const raw = readCookieClient(ACTIVE_PORT_COOKIE);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    console.log('[portfolio.ts] getActivePortfolioClient ->', obj?.slug, obj?.port_id);
    return obj || null;
  } catch (e) {
    console.warn('[portfolio.ts] getActivePortfolioClient parse error:', (e as Error)?.message || e);
    return null;
  }
}

export function setActivePortfolioCookieClient(portfolio: any) {
  try {
    if (typeof document === 'undefined' || !portfolio) return;
    const value = encodeURIComponent(JSON.stringify({
      id: portfolio.id,
      user_id: portfolio.user_id,
      port_id: portfolio.port_id,
      slug: portfolio.slug,
      title: portfolio.title,
      color: portfolio.color,
      icon: portfolio.icon,
    }));
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const secure = location.protocol === 'https:';
    document.cookie = `${ACTIVE_PORT_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure ? 'Secure;' : ''}`;
    console.log('[portfolio.ts] setActivePortfolioCookieClient ->', portfolio?.slug, portfolio?.port_id);
  } catch (e) {
    console.warn('[portfolio.ts] setActivePortfolioCookieClient error:', (e as Error)?.message || e);
  }
}

export function clearActivePortfolioCookieClient() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACTIVE_PORT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax;`;
}

export async function getActivePortfolioServer(): Promise<any | null> {
  try {
    const { cookies } = await import('next/headers');
    const raw = cookies().get(ACTIVE_PORT_COOKIE)?.value;
    if (!raw) return null;
    const obj = JSON.parse(raw);
    console.log('[portfolio.ts] getActivePortfolioServer ->', obj?.slug, obj?.port_id);
    return obj || null;
  } catch (e) {
    console.warn('[portfolio.ts] getActivePortfolioServer parse error:', (e as Error)?.message || e);
    return null;
  }
}

async function fetchPortfolios() {
  if (typeof window !== 'undefined') {
    try {
      const res = await getPortfoliosClient();
      console.log('[portfolio.ts] fetchPortfolios(client) -> count:', res?.data?.length ?? 0);
      return res;
    } catch (e) {
      console.error('[portfolio.ts] fetchPortfolios(client) error:', (e as Error)?.message || e);
      throw e;
    }
  }
  // Dynamically import server helper to avoid bundling into client
  const mod = await import('./api/finance');
  try {
    const res = await mod.getPortfoliosServer();
    console.log('[portfolio.ts] fetchPortfolios(server) -> count:', res?.data?.length ?? 0);
    return res;
  } catch (e) {
    console.error('[portfolio.ts] fetchPortfolios(server) error:', (e as Error)?.message || e);
    throw e;
  }
}

export async function getPortfolio(userId: string) {
  // finatra-api returns portfolios for the authenticated user; userId is not required here
  const result = await fetchPortfolios();
  return result?.data || [];
}

export async function getPortfolioBySlug(slug: string) {
  console.log('[portfolio.ts] getPortfolioBySlug called -> slug:', slug);
  // Try cookie first on the client for fast path
  try {
    if (typeof window !== 'undefined') {
      const cached = getActivePortfolioClient();
      if (cached?.slug === slug) {
        console.log('[portfolio.ts] getPortfolioBySlug(cookie) hit ->', cached.slug, cached.port_id);
        return cached;
      }
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      console.log('[portfolio.ts] getPortfolioBySlug using client endpoint');
      const res = await getPortfolioBySlugClient(slug);
      console.log('[portfolio.ts] getPortfolioBySlug(client) result:', !!res);
      if (res) setActivePortfolioCookieClient(res);
      return res || null;
    }
    console.log('[portfolio.ts] getPortfolioBySlug using server endpoint');
    const mod = await import('./api/finance');
    const res = await mod.getPortfolioBySlugServer(slug);
    console.log('[portfolio.ts] getPortfolioBySlug(server) result:', !!res);
    return res || null;
  } catch (e) {
    console.warn('[portfolio.ts] getPortfolioBySlug endpoint failed, falling back to list. Error:', (e as Error)?.message || e);
    // Fallback to list + filter if direct endpoint fails
    try {
      if (typeof window === 'undefined') {
        // Try cookie on server as a fallback as well
        const cached = await getActivePortfolioServer();
        if (cached?.slug === slug) {
          console.log('[portfolio.ts] getPortfolioBySlug(server cookie) hit ->', cached.slug, cached.port_id);
          return cached;
        }
      }
      const result = await fetchPortfolios();
      const portfolio = result?.data?.find((p: any) => p.slug === slug);
      console.log('[portfolio.ts] getPortfolioBySlug fallback matched:', !!portfolio);
      if (portfolio) setActivePortfolioCookieClient(portfolio);
      return portfolio || null;
    } catch (e2) {
      console.error('[portfolio.ts] getPortfolioBySlug fallback error:', (e2 as Error)?.message || e2);
      return null;
    }
  }
}
