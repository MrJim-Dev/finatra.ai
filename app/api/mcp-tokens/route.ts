import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ScopeError, httpFromScopeError } from "@/lib/auth/scope-error";
import { generateToken } from "@/lib/mcp-auth";

async function getUserId(): Promise<string | null> {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return httpFromScopeError(ScopeError.unauthenticated());

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const [tokensRes, portsRes, groupsRes] = await Promise.all([
    admin
      .from("mcp_tokens")
      .select(
        "id, name, last_four, port_id, created_at, last_used_at, revoked_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("portfolio")
      .select("port_id, created_at")
      .eq("user_id", userId),
    admin
      .from("account_groups")
      .select("port_id, group_name")
      .eq("user_id", userId),
  ]);

  if (tokensRes.error) {
    return NextResponse.json({ error: tokensRes.error.message }, { status: 500 });
  }

  const groupsByPort = new Map<string, string[]>();
  for (const g of groupsRes.data ?? []) {
    const arr = groupsByPort.get(g.port_id) ?? [];
    if (g.group_name && !arr.includes(g.group_name)) arr.push(g.group_name);
    groupsByPort.set(g.port_id, arr);
  }

  const portfolios = (portsRes.data ?? []).map((p) => ({
    port_id: p.port_id as string,
    created_at: p.created_at as string | null,
    group_names: groupsByPort.get(p.port_id as string) ?? [],
  }));

  return NextResponse.json({ tokens: tokensRes.data ?? [], portfolios });
}

const createSchema = z.object({
  name: z.string().min(1).max(128),
  port_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return httpFromScopeError(ScopeError.unauthenticated());

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the portfolio is owned by the session user
  const { data: portfolio } = await admin
    .from("portfolio")
    .select("port_id")
    .eq("port_id", parsed.data.port_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!portfolio) {
    return NextResponse.json(
      { error: "Portfolio not found." },
      { status: 404 }
    );
  }

  const { raw, hash, last_four } = generateToken();

  const { data, error } = await admin
    .from("mcp_tokens")
    .insert({
      user_id: userId,
      port_id: portfolio.port_id,
      name: parsed.data.name.trim(),
      token_hash: hash,
      last_four,
    })
    .select(
      "id, name, last_four, port_id, created_at, last_used_at, revoked_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create token." },
      { status: 500 }
    );
  }

  return NextResponse.json({ token: data, raw });
}
