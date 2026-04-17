"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type McpToken = {
  id: string;
  name: string;
  last_four: string;
  port_id: string;
  created_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

type PortfolioRow = {
  port_id: string;
  created_at: string | null;
  group_names: string[];
};

function shortPort(id: string) {
  return id.slice(0, 8);
}

function portfolioLabel(p: PortfolioRow) {
  if (p.group_names.length > 0) {
    const head = p.group_names.slice(0, 2).join(", ");
    const more = p.group_names.length - 2;
    return `${head}${more > 0 ? ` +${more}` : ""}`;
  }
  return `Portfolio ${shortPort(p.port_id)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function MmMcpTokensPanel({ onBack }: { onBack: () => void }) {
  const [tokens, setTokens] = React.useState<McpToken[]>([]);
  const [portfolios, setPortfolios] = React.useState<PortfolioRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [tokenName, setTokenName] = React.useState("");
  const [tokenPort, setTokenPort] = React.useState("");
  const [newRaw, setNewRaw] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mcp-tokens");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load tokens");
        setTokens([]);
        setPortfolios([]);
        return;
      }
      setTokens(data.tokens ?? []);
      setPortfolios(data.portfolios ?? []);
      if (!tokenPort && data.portfolios?.[0]?.port_id) {
        setTokenPort(data.portfolios[0].port_id);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [tokenPort]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createToken() {
    if (!tokenName.trim()) {
      toast.error("Name required");
      return;
    }
    if (!tokenPort) {
      toast.error("Pick a portfolio");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName.trim(),
          port_id: tokenPort,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Create failed");
        return;
      }
      setNewRaw(data.raw);
      setCreating(false);
      setTokenName("");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken(t: McpToken) {
    if (!window.confirm(`Revoke token "${t.name}"? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/mcp-tokens/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Revoke failed");
        return;
      }
      toast.success("Token revoked");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  const portById = React.useMemo(() => {
    const m = new Map<string, PortfolioRow>();
    for (const p of portfolios) m.set(p.port_id, p);
    return m;
  }, [portfolios]);

  const mcpUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "https://<your-host>/api/mcp";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1"
          onClick={() => setCreating(true)}
          disabled={portfolios.length === 0}
        >
          <Plus className="size-4" />
          New token
        </Button>
      </div>

      <div className="border-border/60 bg-card/40 flex items-start gap-3 rounded-xl border p-3">
        <KeyRound className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="text-muted-foreground text-xs leading-relaxed">
          Tokens authenticate AI clients (Claude Desktop, Claude Code, OpenAI
          custom GPTs, …) against{" "}
          <code className="text-[11px]">/api/mcp</code>. Each token is locked to
          one portfolio — create separate tokens for Personal and Business so
          AI sees isolated data.
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : tokens.length === 0 ? (
        <div className="border-border/60 rounded-xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No tokens yet. Create one to connect an AI client.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[min(360px,50vh)] rounded-md border">
          <ul className="divide-border divide-y p-2 text-sm">
            {tokens.map((t) => {
              const p = portById.get(t.port_id);
              const label = p ? portfolioLabel(p) : shortPort(t.port_id);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate font-medium">
                      {t.name}
                      {t.revoked_at && (
                        <span className="text-destructive text-[10px] uppercase tracking-wider">
                          revoked
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 truncate text-xs">
                      {label} · ···{t.last_four} · used{" "}
                      {formatDate(t.last_used_at)} · created{" "}
                      {formatDate(t.created_at)}
                    </div>
                  </div>
                  {!t.revoked_at && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8 shrink-0"
                      onClick={() => void revokeToken(t)}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

      <div className="border-border/60 bg-muted/30 rounded-xl border p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Connect
        </div>
        <div className="space-y-2 text-xs leading-relaxed">
          <p>
            Endpoint:{" "}
            <code className="text-[11px]">{mcpUrl}</code>
          </p>
          <p>
            Header:{" "}
            <code className="text-[11px]">
              Authorization: Bearer &lt;token&gt;
            </code>
          </p>
          <details className="mt-1">
            <summary className="cursor-pointer select-none text-muted-foreground">
              Claude Desktop / Claude Code config
            </summary>
            <pre className="bg-background/60 mt-2 overflow-x-auto rounded-md border p-2 text-[11px]">{`{
  "mcpServers": {
    "finatra": {
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer <paste-token>" }
    }
  }
}`}</pre>
          </details>
        </div>
      </div>

      <Dialog
        open={creating}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setTokenName("");
          }
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New MCP token</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Claude Desktop — Personal"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Portfolio</Label>
              <select
                className="border-input bg-background h-9 rounded-md border px-2"
                value={tokenPort}
                onChange={(e) => setTokenPort(e.target.value)}
              >
                {portfolios.map((p) => (
                  <option key={p.port_id} value={p.port_id}>
                    {portfolioLabel(p)} — {shortPort(p.port_id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void createToken()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!newRaw}
        onOpenChange={(o) => {
          if (!o) {
            setNewRaw(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy your token — shown once</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <p className="text-muted-foreground text-xs">
              This is the only time the full token is visible. Store it in your
              AI client config now.
            </p>
            <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-2 font-mono text-[12px]">
              <code className="min-w-0 flex-1 break-all">{newRaw}</code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={async () => {
                  if (!newRaw) return;
                  try {
                    await navigator.clipboard.writeText(newRaw);
                    setCopied(true);
                    toast.success("Copied");
                  } catch {
                    toast.error("Copy failed");
                  }
                }}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setNewRaw(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
