'use server';
import { redirect } from 'next/navigation';
import { login as apiLogin, logout as apiLogout, register as apiRegister } from './api/auth';

export async function signInWithOtp(email: string) {
  // Not supported in finatra-api; consider implementing a magic link flow later
  throw new Error('Sign-in with OTP is not supported. Use email/password.');
}

export async function signUp(email: string, password: string, firstName: string, lastName: string) {
  try {
    const res = await apiRegister({ email, password, first_name: firstName, last_name: lastName });
    return { data: res };
  } catch (e: any) {
    return { error: e?.message || 'Registration failed' };
  }
}

export async function signOut() {
  await apiLogout();
  return redirect('/');
}

export async function signInWithPassword(email: string, password: string) {
  try {
    const data = await apiLogin(email, password);
    return { data };
  } catch (e: any) {
    return { error: e?.message || 'Login failed' };
  }
}

export async function signInWith() {
  throw new Error('OAuth sign-in not implemented with finatra-api.');
}
