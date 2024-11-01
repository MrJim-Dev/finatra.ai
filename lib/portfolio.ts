import { CreatePortfolio } from '@/lib/types/portfolio';
import { createClient } from './supabase/server';
export async function createPortfolio(data: CreatePortfolio) {
  const supabase = createClient();

  const { data: newPortfolio, error } = await supabase
    .from('portfolio')
    .insert([
      {
        user_id: data.user_id,
        port_id: crypto.randomUUID(), // Generate a new UUID
        title: data.title,
        icon: data.icon,
        color: data.color,
        userid: data.userid,
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return newPortfolio;
}