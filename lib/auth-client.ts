'use client';

import { login as apiLogin, register as apiRegister, logout as apiLogout } from './api/auth';

// Client-side auth helpers to ensure API sets cookies in the browser context
export async function signInWithPassword(email: string, password: string) {
  try {
    const data = await apiLogin(email, password);
    // Fallback: if Next proxy didn't persist cookies from API response,
    // set secure httpOnly cookies via a local route handler.
    if (data?.access_token && data?.refresh_token && data?.user) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }).catch(() => {});
    }
    return { data };
  } catch (e: any) {
    return { error: e?.message || 'Login failed' };
  }
}

export async function signOut() {
  try {
    await apiLogout();
    // Also clear any locally set cookies just in case
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' }).catch(() => {});
    return { ok: true };
  } catch (e: any) {
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
