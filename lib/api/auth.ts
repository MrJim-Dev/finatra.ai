'use server';
import { apiFetch, apiFetchServer } from './http';

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { email: string; password: string; first_name?: string; last_name?: string };

export async function login(email: string, password: string) {
  // Returns tokens in body and sets cookies; we rely on cookies
  return apiFetch<{ access_token: string; refresh_token: string; user: any }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password } satisfies LoginPayload),
    }
  );
}

export async function register(payload: RegisterPayload) {
  return apiFetch<{ message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  return apiFetch<{ message: string } | undefined>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function meServer() {
  const res = await apiFetchServer<{ message: string; data: any }>(
    '/auth/me',
    { method: 'GET', skipAuth: true }
  );
  return res?.data;
}

export async function meClient() {
  const res = await apiFetch<{ message: string; data: any }>(
    '/auth/me',
    { method: 'GET', skipAuth: true }
  );
  return res?.data;
}

export async function updateProfile(payload: { name?: string; email?: string }) {
  return apiFetch<{ message: string; data?: any }>(`/auth/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
