import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser- or server-safe: pass a Supabase client created for that environment.
 * Do not import this from files that only run on the server if you can use
 * `getPortfolioBySlug` from `@/lib/portfolio` instead.
 */
export async function fetchPortfolioBySlug(
  supabase: SupabaseClient,
  slug: string
) {
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}
