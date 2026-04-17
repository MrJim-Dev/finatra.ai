"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type AccountOpt = { account_id: string; name: string };

type Draft = {
  transaction_type: "income" | "expense" | "transfer";
  amount: number;
  transaction_date: string;
  account_id: string;
  to_account_id?: string | null;
  category: string;
  description?: string | null;
  note?: string | null;
  confidence?: number;
  reasoning?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOpt[];
  defaultDate: string;
  onSuccess: () => void;
};

const EXAMPLES = [
  "coffee at starbucks 180",
  "salary 50000",
  "transfer 2000 from BPI to BDO",
  "grab ride 250 yesterday",
];

export function MmQuickCapture({
  open,
  onOpenChange,
  accounts,
  defaultDate,
  onSuccess,
}: Props) {
  const [text, setText] = React.useState("");
  const [stage, setStage] = React.useState<"input" | "review">("input");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [reasoning, setReasoning] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setText("");
      setStage("input");
      setDraft(null);
      setReasoning(null);
      setBusy(false);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  async function onParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Type what you spent or received.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, today: defaultDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("AI could not parse it", { description: data.error });
        return;
      }
      setDraft(data.draft);
      setReasoning(data.draft?.reasoning ?? null);
      setStage("review");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!draft) return;
    const body = {
      transaction_date: draft.transaction_date,
      account_id: draft.account_id,
      category: draft.category.trim(),
      amount: draft.amount,
      transaction_type: draft.transaction_type,
      note: draft.note?.trim() || null,
      description: draft.description?.trim() || null,
      to_account_id:
        draft.transaction_type === "transfer" ? draft.to_account_id ?? null : null,
    };
    setBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not save", { description: data.error });
        return;
      }
      toast.success("Saved", {
        description: `${draft.transaction_type} · ${draft.category} · ${draft.amount}`,
      });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: val } : d));
  }

  const confidence = draft?.confidence ?? 1;
  const confColor =
    confidence >= 0.75
      ? "bg-emerald-500/15 text-emerald-600"
      : confidence >= 0.5
        ? "bg-amber-500/15 text-amber-600"
        : "bg-destructive/15 text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-accent/15 text-accent flex size-7 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            <DialogTitle className="text-lg tracking-tight">
              {stage === "input" ? "Quick capture" : "Confirm transaction"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {stage === "input"
              ? "Type it like you'd tell a friend. AI fills in type, account, and category."
              : "Review and edit before saving. Fields are editable."}
          </DialogDescription>
        </DialogHeader>

        {stage === "input" ? (
          <form onSubmit={onParse} className="grid gap-3 text-sm">
            <div className="grid gap-1.5">
              <Label htmlFor="qc-text">What happened?</Label>
              <Input
                id="qc-text"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. coffee 180, salary 50k, transfer 2000 to BDO"
                disabled={busy}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-muted-foreground w-full text-[10px] tracking-widest uppercase">
                Try
              </span>
              {EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex}
                  onClick={() => setText(ex)}
                  className="border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground text-muted-foreground rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !text.trim()} className="w-full">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Parse with AI
              </Button>
            </DialogFooter>
          </form>
        ) : draft ? (
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge className={confColor}>
                confidence {(confidence * 100).toFixed(0)}%
              </Badge>
              <button
                type="button"
                onClick={() => setStage("input")}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="size-3" />
                change text
              </button>
            </div>

            {reasoning && (
              <p className="text-muted-foreground text-xs italic">{reasoning}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-2"
                  value={draft.transaction_type}
                  onChange={(e) =>
                    update("transaction_type", e.target.value as Draft["transaction_type"])
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draft.transaction_date}
                  onChange={(e) => update("transaction_date", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Account</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-2"
                value={draft.account_id}
                onChange={(e) => update("account_id", e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {draft.transaction_type === "transfer" && (
              <div className="grid gap-1.5">
                <Label>To account</Label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-2"
                  value={draft.to_account_id ?? ""}
                  onChange={(e) => update("to_account_id", e.target.value || null)}
                >
                  <option value="">—</option>
                  {accounts
                    .filter((a) => a.account_id !== draft.account_id)
                    .map((a) => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Input
                  value={draft.category}
                  onChange={(e) => update("category", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Amount</Label>
                <Input
                  inputMode="decimal"
                  className="tabular-nums"
                  value={String(draft.amount)}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value.replace(/,/g, ""));
                    update("amount", Number.isFinite(n) && n > 0 ? n : draft.amount);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input
                value={draft.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Merchant / payee"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Note</Label>
              <Input
                value={draft.note ?? ""}
                onChange={(e) => update("note", e.target.value)}
                placeholder="Optional memo"
              />
            </div>

            <DialogFooter>
              <Button
                onClick={onSave}
                disabled={busy || !draft.account_id || !draft.category.trim()}
                className="w-full"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save transaction
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
