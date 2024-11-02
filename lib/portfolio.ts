import { CreatePortfolio } from '@/lib/types/portfolio';
import { createClient } from './supabase/client';

export async function getPortfolio(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('portfolio').select('*').eq('userid', userId);
  return data;
}

export async function getPortfolioBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}
