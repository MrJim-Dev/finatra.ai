import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export type AIProvider = "anthropic" | "openai" | "google";

export type FileBlock =
  | { kind: "pdf"; mediaType: "application/pdf"; base64: string }
  | { kind: "image"; mediaType: string; base64: string }
  | { kind: "text"; text: string };

export interface GenerateArgs {
  provider?: AIProvider;
  model?: string;
  system: string;
  cachedSystem?: string;
  userText: string;
  files?: FileBlock[];
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
  model: string;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
};

export function defaultProvider(): AIProvider {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "openai" || p === "anthropic" || p === "google") return p;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_API_KEY) return "google";
  return "openai";
}

export function defaultModel(provider: AIProvider): string {
  return process.env.AI_MODEL || DEFAULT_MODELS[provider];
}

export function providerKeyMissing(provider: AIProvider): string | null {
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY)
    return "ANTHROPIC_API_KEY not set.";
  if (provider === "openai" && !process.env.OPENAI_API_KEY)
    return "OPENAI_API_KEY not set.";
  if (provider === "google" && !process.env.GOOGLE_API_KEY)
    return "GOOGLE_API_KEY not set.";
  return null;
}

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let googleClient: GoogleGenAI | null = null;

function requireKey(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}
function anthropic(): Anthropic {
  if (!anthropicClient)
    anthropicClient = new Anthropic({ apiKey: requireKey("ANTHROPIC_API_KEY") });
  return anthropicClient;
}
function openai(): OpenAI {
  if (!openaiClient)
    openaiClient = new OpenAI({ apiKey: requireKey("OPENAI_API_KEY") });
  return openaiClient;
}
function google(): GoogleGenAI {
  if (!googleClient)
    googleClient = new GoogleGenAI({ apiKey: requireKey("GOOGLE_API_KEY") });
  return googleClient;
}

export async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const provider = args.provider ?? defaultProvider();
  const model = args.model ?? defaultModel(provider);
  const maxTokens = args.maxTokens ?? 2000;

  if (provider === "anthropic") {
    const content: Anthropic.Messages.ContentBlockParam[] = [
      { type: "text", text: args.userText },
    ];
    for (const f of args.files ?? []) {
      if (f.kind === "pdf") {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: f.base64 },
        });
      } else if (f.kind === "image") {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: f.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
            data: f.base64,
          },
        });
      } else {
        content.push({ type: "text", text: f.text });
      }
    }
    const system: Anthropic.Messages.TextBlockParam[] = [
      { type: "text", text: args.system },
    ];
    if (args.cachedSystem) {
      system.push({
        type: "text",
        text: args.cachedSystem,
        cache_control: { type: "ephemeral" },
      });
    }
    const resp = await anthropic().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
    });
    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("No text in model response");
    return { text: block.text, provider, model };
  }

  if (provider === "openai") {
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: args.userText },
    ];
    for (const f of args.files ?? []) {
      if (f.kind === "image") {
        parts.push({
          type: "image_url",
          image_url: { url: `data:${f.mediaType};base64,${f.base64}` },
        });
      } else if (f.kind === "pdf") {
        parts.push({
          type: "file",
          file: {
            filename: "document.pdf",
            file_data: `data:application/pdf;base64,${f.base64}`,
          },
        } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
      } else {
        parts.push({ type: "text", text: f.text });
      }
    }
    const sys = args.cachedSystem
      ? `${args.system}\n\n${args.cachedSystem}`
      : args.system;
    const resp = await openai().chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: parts },
      ],
    });
    const text = resp.choices[0]?.message?.content ?? "";
    return { text, provider, model };
  }

  // google
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: args.userText }];
  for (const f of args.files ?? []) {
    if (f.kind === "pdf") {
      parts.push({ inlineData: { mimeType: "application/pdf", data: f.base64 } });
    } else if (f.kind === "image") {
      parts.push({ inlineData: { mimeType: f.mediaType, data: f.base64 } });
    } else {
      parts.push({ text: f.text });
    }
  }
  const sys = args.cachedSystem
    ? `${args.system}\n\n${args.cachedSystem}`
    : args.system;
  const resp = await google().models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: sys,
      maxOutputTokens: maxTokens,
    },
  });
  return { text: resp.text ?? "", provider, model };
}
