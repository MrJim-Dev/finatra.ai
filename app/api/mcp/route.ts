import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getAdminClient } from "@/lib/supabase/admin";
import { authenticateBearer, extractBearer } from "@/lib/mcp-auth";
import { buildFinatraMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handle(request: Request): Promise<Response> {
  const supabase = getAdminClient();
  if (!supabase) {
    return jsonResponse(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const bearer = extractBearer(request);
  if (!bearer) {
    return jsonResponse(
      { error: "Missing Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  const auth = await authenticateBearer(supabase, bearer);
  if (!auth) {
    return jsonResponse(
      { error: "Invalid or revoked token." },
      { status: 401 }
    );
  }

  const server = buildFinatraMcpServer(supabase, auth);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCors(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, { status: 500 });
  } finally {
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
