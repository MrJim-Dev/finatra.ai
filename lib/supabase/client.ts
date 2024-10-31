import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const supabase = createClient();

export async function getUser() {
  const { data } = await supabase.auth.getUser();

  return data;
}

export async function getUserById(id: string) {
  const supabase = createClient();
  
  let { data, error } = await supabase
    .from('users')
    .select('*').eq('id', id).single()

  if (data) {
    const avatarUrl = getPublicUrl('profiles', data.avatar);
    data.avatar_url = avatarUrl;
  }

  console.log(data);

  return data
}

export function getPublicUrl(bucket: string, path: string): string | null {
  const supabase = createClient();
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);

  if (!data) {
    return null;
  }

  return data.publicUrl;
}
