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
  type FileBlock,
} from "@/lib/ai/client";
import {
  loadPortfolioSnapshot,
  snapshotToPromptContext,
} from "@/lib/ai/portfolio-snapshot";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB

const rowSchema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transaction_type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().finite().positive(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1).max(256),
  description: z.string().max(512).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const responseSchema = z.object({
  rows: z.array(rowSchema),
  source_summary: z.string().max(1000).optional(),
  issues: z.array(z.string().max(500)).optional(),
});

const SYSTEM_PROMPT = `You extract transactions from a bank statement, receipt, or financial document and categorize each one.

Rules:
- Output ONLY JSON: { "rows": [...], "source_summary": "...", "issues": [...] }.
- Each row: transaction_date (YYYY-MM-DD), transaction_type (income|expense|transfer), amount (POSITIVE number), account_id (UUID from provided list), to_account_id (UUID, only for transfers), category (existing category name preferred, else concise Title Case label), description, note, confidence (0-1).
- Pick the most likely account_id for this statement. If user hinted one, use it. If not clear, default to the best-matching checking/savings account.
- Transfers between own accounts should be transaction_type="transfer" with to_account_id set when both sides of the transfer are in the user's accounts list; otherwise treat as expense/income.
- Never invent dates. If the date is ambiguous, use the earliest plausible and note it in issues[].
- Skip rows that are summaries, opening/closing balances, or fees already present in a running balance column.
- If a row's sign is unclear, set confidence <= 0.5 and add a note.
- source_summary: one short sentence about the document (bank, period, account).
- issues: list anything you were unsure about — empty array if none.`;

async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

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

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const hint = (form.get("hint") as string | null)?.slice(0, 500) ?? "";
  const accountHint = form.get("account_id") as string | null;
  const providerHint = (form.get("provider") as string | null)?.toLowerCase();
  const modelHint = (form.get("model") as string | null)?.slice(0, 100) || null;

  const provider: AIProvider =
    providerHint === "openai" || providerHint === "anthropic" || providerHint === "google"
      ? providerHint
      : defaultProvider();
  const model = modelHint || defaultModel(provider);
  const keyErr = providerKeyMissing(provider);
  if (keyErr) {
    return NextResponse.json(
      { error: `${keyErr} Add it to .env.local.` },
      { status: 503 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Upload a file via the 'file' field." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 12MB).` },
      { status: 413 }
    );
  }

  const { user_id, port_id } = scope;
  const supabase = await createClient();
  const snapshot = await loadPortfolioSnapshot(supabase, port_id, user_id);
  if (snapshot.accounts.length === 0) {
    return NextResponse.json(
      { error: "No accounts exist for this portfolio." },
      { status: 400 }
    );
  }

  const name = file.name || "upload";
  const mime = (file.type || "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = mime === "application/pdf" || ext === "pdf";
  const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
  const isTextLike =
    mime.startsWith("text/") ||
    ["csv", "tsv", "txt", "tab", "ofx", "qif"].includes(ext) ||
    mime === "application/csv";

  const files: FileBlock[] = [];

  const intro =
    `File: ${name}\n` +
    (accountHint ? `\nUser says this document is for account_id: ${accountHint}` : "") +
    (hint ? `\nUser hint: ${hint}` : "") +
    `\n\nExtract the transactions and return JSON.`;

  if (isPdf) {
    files.push({
      kind: "pdf",
      mediaType: "application/pdf",
      base64: await fileToBase64(file),
    });
  } else if (isImage) {
    const m = mime.startsWith("image/") ? mime : `image/${ext === "jpg" ? "jpeg" : ext}`;
    files.push({
      kind: "image",
      mediaType: m,
      base64: await fileToBase64(file),
    });
  } else if (isTextLike) {
    const text = await file.text();
    const clipped = text.length > 200_000 ? text.slice(0, 200_000) + "\n…(truncated)" : text;
    files.push({ kind: "text", text: `Raw file contents:\n\n${clipped}` });
  } else {
    return NextResponse.json(
      { error: `Unsupported file type '${mime || ext}'. Use PDF, image (png/jpg), or CSV/TXT.` },
      { status: 415 }
    );
  }

  let raw: string;
  try {
    const resp = await generate({
      provider,
      model,
      system: SYSTEM_PROMPT,
      cachedSystem: snapshotToPromptContext(snapshot),
      userText: intro,
      files,
      maxTokens: 8000,
    });
    raw = resp.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Model call failed";
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }

  let parsedOut: z.infer<typeof responseSchema>;
  try {
    const obj = jsonFromText(raw);
    const v = responseSchema.safeParse(obj);
    if (!v.success) {
      return NextResponse.json(
        { error: "AI returned an invalid rows payload.", details: v.error.flatten(), raw },
        { status: 502 }
      );
    }
    parsedOut = v.data;
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse AI output: ${(err as Error).message}`, raw },
      { status: 502 }
    );
  }

  const validIds = new Set(snapshot.accounts.map((a) => a.account_id));
  const cleanRows = parsedOut.rows.filter((r) => validIds.has(r.account_id)).map((r) => {
    if (r.to_account_id && !validIds.has(r.to_account_id)) r.to_account_id = null;
    if (r.transaction_type === "transfer" && !r.to_account_id) r.transaction_type = "expense";
    return r;
  });

  return NextResponse.json({
    rows: cleanRows,
    dropped: parsedOut.rows.length - cleanRows.length,
    source_summary: parsedOut.source_summary ?? null,
    issues: parsedOut.issues ?? [],
    port_id,
  });
}
