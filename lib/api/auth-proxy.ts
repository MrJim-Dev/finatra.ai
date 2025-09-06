'use client';

const dev = process.env.NODE_ENV === 'development';
const dlog = (...args: any[]) => {
  if (dev) console.log('[AuthProxy]', ...args);
};

// Client-side authenticated API calls using the auth proxy
export async function authenticatedFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api/auth/proxy?path=${encodeURIComponent(path)}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for server-side auth
  });

  if (!response.ok) {
    let errorMessage = `Request failed ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) errorMessage = errorBody.message;
      if (errorBody?.error) errorMessage = errorBody.error;
    } catch (e) {
      // If we can't parse the error, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    // Only log critical auth errors for debugging
    if (response.status === 401) {
      dlog('Unauthorized:', options.method || 'GET', path);

      // Check if we need to re-authenticate
      try {
        const errorBody = JSON.parse(errorMessage);
        if (errorBody?.needsReauth) {
          dlog('Authentication expired, redirecting to signin...');
          // Force redirect to login page
          window.location.href = '/signin';
          return;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    } else if (response.status >= 500) {
      console.error(
        `[AuthProxy] Server Error ${response.status}: ${options.method || 'GET'} ${path}`
      );
    }

    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) return undefined as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    return text as unknown as T;
  }
}

// Specific API functions using the authenticated proxy
export async function getPortfoliosAuthenticated() {
  return authenticatedFetch<{ data: any[]; pagination: any }>('/portfolios');
}

export async function getAuthMeAuthenticated() {
  return authenticatedFetch<{ message: string; data: any }>('/auth/me');
}

export async function getAccountGroupsByPortfolioAuthenticated(portId: string) {
  return authenticatedFetch(`/account-groups/by-portfolio/${portId}`);
}

export async function createAccountGroupAuthenticated(payload: any) {
  return authenticatedFetch('/account-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createAccountAuthenticated(payload: any) {
  return authenticatedFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccountAuthenticated(id: string, payload: any) {
  return authenticatedFetch(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccountAuthenticated(id: string) {
  return authenticatedFetch(`/accounts/${id}`, {
    method: 'DELETE',
  });
}

export async function updateAccountGroupAuthenticated(
  id: number,
  payload: any
) {
  return authenticatedFetch(`/account-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccountGroupAuthenticated(id: number) {
  return authenticatedFetch(`/account-groups/${id}`, {
    method: 'DELETE',
  });
}

export async function getAccountsByPortfolioAuthenticated(portId: string) {
  return authenticatedFetch(`/accounts/by-portfolio/${portId}`);
}

export async function getTransactionsAuthenticated(params: {
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
  return authenticatedFetch<{ data: any[]; pagination: any }>(
    `/transactions?${qs.toString()}`
  );
}

export async function getCategoryHierarchyAuthenticated(
  portId: string,
  type?: 'income' | 'expense'
) {
  const qs = type ? `?type=${type}` : '';
  return authenticatedFetch(`/categories/hierarchy/${portId}${qs}`);
}
