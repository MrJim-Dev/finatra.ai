'use client';

import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
} from './api/auth';

// Client-side auth helpers to ensure API sets cookies in the browser context
export async function signInWithPassword(email: string, password: string) {
  try {
    console.log('[auth-client] Starting direct API login...');

    // SOLUTION: Call API directly to get proper Set-Cookie headers instead of using Next.js proxy
    // This ensures the browser receives the HttpOnly cookies directly from the API server
    const apiUrl =
      process.env.NEXT_PUBLIC_FINATRA_API_URL || 'http://localhost:3333';
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Critical: This ensures cookies are set by the browser
    });

    if (!loginResponse.ok) {
      let errorMessage = `Login failed ${loginResponse.status}`;
      try {
        const errorBody = await loginResponse.json();
        if (errorBody?.message) errorMessage = errorBody.message;
      } catch {}
      throw new Error(errorMessage);
    }

    const data = await loginResponse.json();
    console.log(
      '[auth-client] Direct API login successful, cookies set by browser'
    );

    return { data };
  } catch (e: any) {
    console.error('[auth-client] Login error:', e);
    return { error: e?.message || 'Login failed' };
  }
}

export async function signOut() {
  try {
    console.log('[auth-client] Starting direct API logout...');

    // Call API directly to ensure proper cookie clearing
    const apiUrl =
      process.env.NEXT_PUBLIC_FINATRA_API_URL || 'http://localhost:3333';
    const logoutResponse = await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      credentials: 'include', // Critical: This ensures cookies are cleared by the API
    });

    if (!logoutResponse.ok) {
      console.warn('[auth-client] API logout failed:', logoutResponse.status);
      // Continue anyway to clear any remaining cookies
    } else {
      console.log(
        '[auth-client] Direct API logout successful, cookies cleared by API'
      );
    }

    return { ok: true };
  } catch (e: any) {
    console.error('[auth-client] Logout error:', e);
    return { error: e?.message || 'Logout failed' };
  }
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  try {
    const res = await apiRegister({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });
    return { data: res };
  } catch (e: any) {
    return { error: e?.message || 'Registration failed' };
  }
}
