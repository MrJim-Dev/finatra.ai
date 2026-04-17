import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const TOKEN_PREFIX = "fin_";

export type McpAuthContext = {
  token_id: string;
  user_id: string;
  port_id: string;
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): {
  raw: string;
  hash: string;
  last_four: string;
} {
  const secret = randomBytes(32).toString("base64url");
  const raw = `${TOKEN_PREFIX}${secret}`;
  return { raw, hash: hashToken(raw), last_four: raw.slice(-4) };
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** Look up a raw bearer token. Returns null if unknown or revoked. */
export async function authenticateBearer(
  supabase: SupabaseClient,
  bearer: string
): Promise<McpAuthContext | null> {
  if (!bearer) return null;
  const { data } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, port_id, revoked_at")
    .eq("token_hash", hashToken(bearer))
    .maybeSingle();
  if (!data || data.revoked_at) return null;

  void supabase
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { token_id: data.id, user_id: data.user_id, port_id: data.port_id };
}
