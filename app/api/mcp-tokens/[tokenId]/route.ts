import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ScopeError, httpFromScopeError } from "@/lib/auth/scope-error";

export const dynamic = "force-dynamic";

type Ctx = { params: { tokenId: string } };

async function getUserId(): Promise<string | null> {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  return user?.id ?? null;
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return httpFromScopeError(ScopeError.unauthenticated());

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  const { tokenId } = ctx.params;

  const { data, error } = await admin
    .from("mcp_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Token not found or already revoked." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
