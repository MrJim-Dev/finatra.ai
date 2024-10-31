'use server';
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { createClient } from './supabase/server';
import { Provider, User } from '@supabase/supabase-js';

export async function signInWithOtp(email: string) {
  const supabase = createClient();
  let { data, error } = await supabase.auth.signInWithOtp({
    email: email,
  });


  return data;
}


export async function signUp(email: string, password: string, firstName: string, lastName: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    console.error("Error signing up:", error.message);
    return { error: error.message };
  }

  return { data };
}


export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect('/');
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error.message);
    return { error: error.message };
  }

  return { data };
}




export async function signInWith(provider: Provider) {
  const origin = headers().get("origin");
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  // TODO: Handle profile picture upload

  if (error) {
    return redirect(`/signin?error=${error.message || "Could not authenticate user"}`);
  }


  return redirect(data.url);
}
