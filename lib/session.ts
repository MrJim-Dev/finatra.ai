'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetchServer } from './api/http';

export type CurrentUser = any;

// Try to read the user from the httpOnly cookie first; fall back to API verification
export async function getCurrentUserServer(): Promise<CurrentUser | undefined> {
  const jar = cookies();
  const raw = jar.get('user')?.value;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  const res = await apiFetchServer<{ message: string; data: any }>('/auth/me', {
    method: 'GET',
    skipAuth: true,
  });
  return res?.data;
}

export async function requireAuthServer(): Promise<CurrentUser> {
  const user = await getCurrentUserServer();

  console.log('requireAuthServer', user);
  // if (!user) {
  //   redirect('/signin');
  // }
  return user as CurrentUser;
}
