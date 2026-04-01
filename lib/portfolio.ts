import 'server-only';

import { createClient } from './supabase/server';
import { fetchPortfolioBySlug as fetchPortfolioBySlugQuery } from './portfolio-queries';

export async function getPortfolio(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function getPortfolioBySlug(slug: string) {
  const supabase = await createClient();
  return fetchPortfolioBySlugQuery(supabase, slug);
}
