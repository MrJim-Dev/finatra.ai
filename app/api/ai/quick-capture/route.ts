import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveScope } from "@/lib/ai/resolve-scope";
import {
  generate,
  defaultProvider,
  defaultModel,
  providerKeyMissing,
  type AIProvider,
} from "@/lib/ai/client";
import {
  loadPortfolioSnapshot,
  snapshotToPromptContext,
} from "@/lib/ai/portfolio-snapshot";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  port_id: z.string().uuid().optional(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  provider: z.enum(["anthropic", "openai", "google"]).optional(),
  model: z.string().min(1).max(100).optional(),
});

const draftSchema = z.object({
  transaction_type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().finite().positive(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1).max(256),
  description: z.string().max(512).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().max(800).optional(),
});

const SYSTEM_PROMPT = `You convert short natural-language notes (e.g. "coffee 150", "salary 50k", "moved 5000 from BPI to BDO") into a single finance transaction draft JSON.

Rules:
- Output ONLY a single JSON object — no prose, no markdown fences.
- transaction_type: "income" (money in), "expense" (money out), or "transfer" (between own accounts).
- account_id must be one of the provided accounts; pick the best match by name/group. If user says "transfer to X", set to_account_id = X's id.
- category must be an existing category when one fits; otherwise invent a concise Title Case label (e.g. "Food & Drink"). Do NOT match the account name.
- amount is always POSITIVE. The type determines flow.
- transaction_date = YYYY-MM-DD. Default to today unless the text says otherwise ("yesterday", "last friday", etc).
- description = short merchant/payee (e.g. "Starbucks"). note = free text if user left a clear memo.
- confidence 0-1: how sure you are about account + type + category. If the user did not name an account, pick the most plausible default ("Cash" / first checking) and mark confidence <= 0.5.
- reasoning: one short sentence explaining your picks.`;

function jsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function POST(request: Request) {
  const scope = await resolveScope();
  if (!scope) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const provider: AIProvider = parsed.data.provider ?? defaultProvider();
  const model = parsed.data.model ?? defaultModel(provider);
  const keyErr = providerKeyMissing(provider);
  if (keyErr) {
    return NextResponse.json(
      { error: `${keyErr} Add it to .env.local.` },
      { status: 503 }
    );
  }

  const { user_id, port_id } = scope;
  const supabase = await createClient();
  const snapshot = await loadPortfolioSnapshot(supabase, port_id, user_id);
  if (snapshot.accounts.length === 0) {
    return NextResponse.json(
      { error: "No accounts exist. Create one before using quick capture." },
      { status: 400 }
    );
  }

  const today = parsed.data.today ?? new Date().toISOString().slice(0, 10);

  const userPrompt = `Today is ${today}.

${snapshotToPromptContext(snapshot)}

User input: """${parsed.data.text.trim()}"""

Return the transaction JSON.`;

  let raw: string;
  try {
    const resp = await generate({
      provider,
      model,
      system: SYSTEM_PROMPT,
      cachedSystem: snapshotToPromptContext(snapshot),
      userText: userPrompt,
      maxTokens: 600,
    });
    raw = resp.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Model call failed";
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }

  let draft: z.infer<typeof draftSchema>;
  try {
    const obj = jsonFromText(raw);
    const v = draftSchema.safeParse(obj);
    if (!v.success) {
      return NextResponse.json(
        { error: "AI returned an invalid draft.", details: v.error.flatten(), raw },
        { status: 502 }
      );
    }
    draft = v.data;
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse AI output: ${(err as Error).message}`, raw },
      { status: 502 }
    );
  }

  const validIds = new Set(snapshot.accounts.map((a) => a.account_id));
  if (!validIds.has(draft.account_id)) {
    return NextResponse.json(
      { error: "AI picked an unknown account_id.", raw },
      { status: 502 }
    );
  }
  if (draft.to_account_id && !validIds.has(draft.to_account_id)) {
    draft.to_account_id = null;
  }
  if (draft.transaction_type === "transfer" && !draft.to_account_id) {
    draft.transaction_type = "expense";
  }

  return NextResponse.json({ draft, port_id });
}
