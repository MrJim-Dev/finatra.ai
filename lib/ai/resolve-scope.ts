import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const PORTFOLIO_COOKIE = "finatra_port_id";

export type Scope = { user_id: string; port_id: string };

export async function resolveScope(): Promise<Scope | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = cookies();
  const cookieVal = cookieStore.get(PORTFOLIO_COOKIE)?.value;

  if (cookieVal) {
    const { data } = await supabase
      .from("portfolio")
      .select("port_id")
      .eq("port_id", cookieVal)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) return { user_id: user.id, port_id: data.port_id };
  }

  const { data: fallback } = await supabase
    .from("portfolio")
    .select("port_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fallback) return null;
  return { user_id: user.id, port_id: fallback.port_id };
}
