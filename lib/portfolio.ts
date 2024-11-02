import { CreatePortfolio } from '@/lib/types/portfolio';
import { createClient } from './supabase/server';

export async function getPortfolio(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('portfolio').select('*').eq('userid', userId);
  return data;
}

