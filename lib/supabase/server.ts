"use server"
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ProjectTypes } from '../types/project';
import { User } from '@supabase/supabase-js';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getPublicUrl(bucket: string, path: string | null): Promise<string | null> {
  if (path === null) {
    return null;
  }
  const supabase = await createClient();
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);

  if (!data) {
    return null;
  }

  return data.publicUrl;
}

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return data
}

export async function getUserData() {
  const supabase = await createClient();

  const {user} = await getUser();

  
  let { data, error } = await supabase
    .from('users')
    .select('*').eq('id', user?.id).single()

  if (data) {
    const avatarUrl = getPublicUrl('profiles', data.avatar);
    data.avatar_url = avatarUrl;
  }

  return data
}

export async function getUserById(id: string) {
  const supabase = await createClient();
  
  let { data, error } = await supabase
    .from('users')
    .select('*').eq('id', id).single()

  if (data) {
    const avatarUrl = getPublicUrl('profiles', data.avatar);
    data.avatar_url = avatarUrl;
  }

  return data
}

export async function getAllUsers() {
  const supabase = await createClient();
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return users;
  }

  return;
}


export async function sendPasswordRecovery(email: string) {
  const supabase = await createClient();
  let { data, error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    // console.log(data);
    return data;
  }

  return;
}


