'use server';
import { apiFetch, apiFetchServer, type ApiOptions } from './http';

// Dev-only logger
function dbg(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[finance]', ...args);
  }
}

// Use the authenticated proxy for client-side calls so Authorization is forwarded
async function apiFetchViaAuthProxy<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (typeof window === 'undefined') {
    // Fallback to server fetch when invoked on the server
    return apiFetchServer<T>(path, init as ApiOptions);
  }
  const url = `/api/auth/proxy?path=${encodeURIComponent(path)}`;

  dbg('client proxy ->', init.method || 'GET', path, 'via', url);

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed ${res.status}`;
    let errorDetails = null;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      if (body?.error) message = body.error;
      errorDetails = body;
    } catch (parseError) {
      dbg('client proxy error parse failed <-', res.status, path, parseError);
    }

    // Enhanced error logging for auth proxy failures
    if (res.status === 401) {
      dbg('client proxy auth error <-', res.status, path, {
        error: message,
        errorDetails,
        cookies:
          typeof document !== 'undefined' ? document.cookie : 'server-side',
        userAgent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent.substring(0, 50)
            : 'unknown',
      });
    } else {
      dbg('client proxy error <-', res.status, path, message);
    }

    throw new Error(message);
  }
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}

// Portfolios
export async function getPortfoliosServer(options: ApiOptions = {}) {
  try {
    const res = await apiFetchServer<{ data: any[]; pagination: any }>(
      '/portfolios',
      { method: 'GET', ...options }
    );

    // Ensure a consistent shape to avoid destructuring errors upstream
    if (!res || typeof res !== 'object' || !('data' in (res as any))) {
      // invalid shape; return safe default
      return { data: [], pagination: null } as { data: any[]; pagination: any };
    }

    return res;
  } catch (error) {
    return { data: [], pagination: null } as { data: any[]; pagination: any };
  }
}

export async function getPortfoliosClient() {
  try {
    const res = await apiFetchViaAuthProxy<{ data: any[]; pagination: any }>(
      '/portfolios',
      { method: 'GET' }
    );

    if (!res || typeof res !== 'object' || !('data' in (res as any))) {
      return { data: [], pagination: null } as { data: any[]; pagination: any };
    }
    return res;
  } catch (error) {
    // If authentication failed, try with skipAuth for development/fallback
    if (
      error instanceof Error &&
      (error.message.includes('Missing token') ||
        error.message.includes('Invalid token'))
    ) {
      try {
        const fallbackRes = await apiFetch<{ data: any[]; pagination: any }>(
          '/portfolios',
          { method: 'GET', skipAuth: true }
        );

        if (
          fallbackRes &&
          typeof fallbackRes === 'object' &&
          'data' in fallbackRes
        ) {
          return fallbackRes;
        }
      } catch (fallbackError) {}
    }

    throw error; // Re-throw to let calling code handle the error
  }
}

export async function createPortfolio(payload: {
  title: string;
  icon?: any;
  color?: string;
}) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>('/portfolios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  // SSR fallback
  return apiFetchServer<any>('/portfolios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPortfolioByIdServer(id: string) {
  return apiFetchServer<any>(`/portfolios/${id}`, { method: 'GET' });
}

export async function getPortfolioBySlugServer(slug: string) {
  return apiFetchServer<any>(
    `/portfolios/by-slug/${encodeURIComponent(slug)}`,
    { method: 'GET' }
  );
}

export async function getPortfolioBySlugClient(slug: string) {
  return apiFetchViaAuthProxy<any>(
    `/portfolios/by-slug/${encodeURIComponent(slug)}`,
    { method: 'GET' }
  );
}

// Accounts
export async function getAccountsByPortfolioServer(portId: string) {
  const res = await apiFetchServer<{ data: any[]; pagination: any }>(
    `/accounts/by-portfolio/${portId}`,
    { method: 'GET' }
  ).catch(() => undefined as unknown as { data: any[]; pagination: any });
  if (!res || typeof res !== 'object' || !('data' in (res as any))) {
    return { data: [], pagination: null } as { data: any[]; pagination: any };
  }
  return res;
}

export async function createAccount(payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(id: string, payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>(`/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>(`/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(id: string) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>(`/accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
  return apiFetchServer<any>(`/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Categories
export async function getCategoryHierarchyServer(
  portId: string,
  type?: 'income' | 'expense'
) {
  const qs = type ? `?type=${type}` : '';
  return apiFetchServer<any[]>(`/categories/hierarchy/${portId}${qs}`, {
    method: 'GET',
  });
}

export async function getCategoriesServer(params: {
  port_id?: string;
  type?: 'income' | 'expense';
}) {
  const qs = new URLSearchParams();
  if (params.port_id) qs.set('port_id', params.port_id);
  if (params.type) qs.set('type', params.type);
  const q = qs.toString();
  return apiFetchServer<any[]>(`/categories${q ? `?${q}` : ''}`, {
    method: 'GET',
  });
}

export async function createCategory(payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: number, payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: number) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>(`/categories/${id}`, { method: 'DELETE' });
  }
  return apiFetchServer<any>(`/categories/${id}`, { method: 'DELETE' });
}

// Transactions
export async function getTransactionsServer(params: {
  port_id: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set('port_id', params.port_id);
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetchServer<{ data: any[]; pagination: any }>(
    `/transactions?${qs.toString()}`,
    { method: 'GET' }
  );
}

export async function createTransaction(payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(id: string, payload: any) {
  if (typeof window !== 'undefined') {
    return apiFetchViaAuthProxy<any>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
  return apiFetchServer<any>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Client-side variants
export async function getAccountsByPortfolioClient(portId: string) {
  return apiFetchViaAuthProxy<{ data: any[]; pagination: any }>(
    `/accounts/by-portfolio/${portId}`,
    { method: 'GET' }
  );
}

export async function getTransactionsClient(params: {
  port_id: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set('port_id', params.port_id);
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetchViaAuthProxy<{ data: any[]; pagination: any }>(
    `/transactions?${qs.toString()}`,
    { method: 'GET' }
  );
}

export async function getCategoryHierarchyClient(
  portId: string,
  type?: 'income' | 'expense'
) {
  const qs = type ? `?type=${type}` : '';
  return apiFetchViaAuthProxy<any[]>(`/categories/hierarchy/${portId}${qs}`, {
    method: 'GET',
  });
}
export async function getAccountGroupsByPortfolioClient(portId: string) {
  const res = await apiFetchViaAuthProxy<any>(
    `/account-groups/by-portfolio/${portId}`,
    {
      method: 'GET',
    }
  ).catch(() => [] as any[]);
  if (Array.isArray(res)) {
    return { data: res } as { data: any[] };
  }
  if (res && typeof res === 'object' && 'data' in (res as any)) {
    return { data: (res as any).data } as { data: any[] };
  }
  return { data: [] as any[] } as { data: any[] };
}
export async function createAccountGroup(payload: any) {
  return apiFetchViaAuthProxy<any>('/account-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccountGroup(id: number, payload: any) {
  return apiFetchViaAuthProxy<any>(`/account-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccountGroup(id: number) {
  return apiFetchViaAuthProxy<any>(`/account-groups/${id}`, {
    method: 'DELETE',
  });
}

// Server-side variant to fetch account groups by portfolio
export async function getAccountGroupsByPortfolioServer(portId: string) {
  const res = await apiFetchServer<any>(
    `/account-groups/by-portfolio/${portId}`,
    { method: 'GET' }
  ).catch(() => [] as any[]);
  // Normalize to a common shape with data[] so SSR code can destructure safely
  if (Array.isArray(res)) {
    return { data: res } as { data: any[] };
  }
  if (res && typeof res === 'object' && 'data' in (res as any)) {
    return { data: (res as any).data } as { data: any[] };
  }
  return { data: [] as any[] } as { data: any[] };
}
