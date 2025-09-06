'use server';
import { apiFetch, apiFetchServer, type ApiOptions } from './http';

// Portfolios
export async function getPortfoliosServer(options: ApiOptions = {}) {
  try {
    console.log(
      '[getPortfoliosServer] Fetching portfolios with options:',
      options
    );
    const res = await apiFetchServer<{ data: any[]; pagination: any }>(
      '/portfolios',
      { method: 'GET', ...options }
    );

    console.log(
      '[getPortfoliosServer] Response received:',
      res ? 'success' : 'empty'
    );

    // Ensure a consistent shape to avoid destructuring errors upstream
    if (!res || typeof res !== 'object' || !('data' in (res as any))) {
      console.warn(
        '[getPortfoliosServer] Invalid response format, returning empty data'
      );
      return { data: [], pagination: null } as { data: any[]; pagination: any };
    }

    console.log(
      '[getPortfoliosServer] Returning portfolios:',
      res.data?.length ?? 0
    );
    return res;
  } catch (error) {
    console.error('[getPortfoliosServer] Error fetching portfolios:', error);
    return { data: [], pagination: null } as { data: any[]; pagination: any };
  }
}

export async function getPortfoliosClient() {
  try {
    console.log('[getPortfoliosClient] Fetching portfolios from client');
    const res = await apiFetch<{ data: any[]; pagination: any }>(
      '/portfolios',
      { method: 'GET' }
    );

    console.log(
      '[getPortfoliosClient] Response received:',
      res ? 'success' : 'empty'
    );

    if (!res || typeof res !== 'object' || !('data' in (res as any))) {
      console.warn(
        '[getPortfoliosClient] Invalid response format, returning empty data'
      );
      return { data: [], pagination: null } as { data: any[]; pagination: any };
    }

    console.log(
      '[getPortfoliosClient] Returning portfolios:',
      res.data?.length ?? 0
    );
    return res;
  } catch (error) {
    console.error('[getPortfoliosClient] Error fetching portfolios:', error);

    // If authentication failed, try with skipAuth for development/fallback
    if (
      error instanceof Error &&
      (error.message.includes('Missing token') ||
        error.message.includes('Invalid token'))
    ) {
      console.log(
        '[getPortfoliosClient] Auth failed, trying skipAuth fallback'
      );
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
          console.log(
            '[getPortfoliosClient] Fallback successful:',
            fallbackRes.data?.length ?? 0
          );
          return fallbackRes;
        }
      } catch (fallbackError) {
        console.error(
          '[getPortfoliosClient] Fallback also failed:',
          fallbackError
        );
      }
    }

    throw error; // Re-throw to let calling code handle the error
  }
}

export async function createPortfolio(payload: {
  title: string;
  icon?: any;
  color?: string;
}) {
  return apiFetch<any>('/portfolios', {
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
  return apiFetch<any>(`/portfolios/by-slug/${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
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
  return apiFetch<any>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(id: string, payload: any) {
  return apiFetch<any>(`/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(id: string) {
  return apiFetch<any>(`/accounts/${encodeURIComponent(id)}`, {
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
  return apiFetch<any>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: number, payload: any) {
  return apiFetch<any>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: number) {
  return apiFetch<any>(`/categories/${id}`, { method: 'DELETE' });
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
  return apiFetch<any>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(id: string, payload: any) {
  return apiFetch<any>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Client-side variants
export async function getAccountsByPortfolioClient(portId: string) {
  return apiFetch<{ data: any[]; pagination: any }>(
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
  return apiFetch<{ data: any[]; pagination: any }>(
    `/transactions?${qs.toString()}`,
    { method: 'GET' }
  );
}

export async function getCategoryHierarchyClient(
  portId: string,
  type?: 'income' | 'expense'
) {
  const qs = type ? `?type=${type}` : '';
  return apiFetch<any[]>(`/categories/hierarchy/${portId}${qs}`, {
    method: 'GET',
  });
}
export async function getAccountGroupsByPortfolioClient(portId: string) {
  const res = await apiFetch<any>(`/account-groups/by-portfolio/${portId}`, {
    method: 'GET',
  }).catch(() => [] as any[]);
  if (Array.isArray(res)) {
    return { data: res } as { data: any[] };
  }
  if (res && typeof res === 'object' && 'data' in (res as any)) {
    return { data: (res as any).data } as { data: any[] };
  }
  return { data: [] as any[] } as { data: any[] };
}
export async function createAccountGroup(payload: any) {
  return apiFetch<any>('/account-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccountGroup(id: number, payload: any) {
  return apiFetch<any>(`/account-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccountGroup(id: number) {
  return apiFetch<any>(`/account-groups/${id}`, { method: 'DELETE' });
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
