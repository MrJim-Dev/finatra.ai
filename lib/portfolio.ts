import { CreatePortfolio } from '@/lib/types/portfolio';
import { createClient } from './supabase/server'; // ← Change to server client

export async function getPortfolio(userId: string) {
  const supabase = await createClient(); // ← Add await for server client
  const { data, error } = await supabase.from('portfolio').select('*').eq('userid', userId);
  return data;
}

export async function getPortfolioBySlug(slug: string) {
  const supabase = await createClient(); // ← Add await for server client
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}
