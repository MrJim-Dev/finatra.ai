"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  FileText,
  Sparkles,
  Trash2,
  Save,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AccountOpt = { account_id: string; name: string };
type TxType = "income" | "expense" | "transfer";

type ExtractedRow = {
  transaction_date: string;
  transaction_type: TxType;
  amount: number;
  account_id: string;
  to_account_id?: string | null;
  category: string;
  description?: string | null;
  note?: string | null;
  confidence?: number;
};

type Props = {
  accounts: AccountOpt[];
  onBack: () => void;
  onCommitted: () => void;
};

const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,text/csv,text/plain,.csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.webp";

export function MmStatementUpload({ accounts, onBack, onCommitted }: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [hint, setHint] = React.useState("");
  const [accountHint, setAccountHint] = React.useState<string>("");
  const [parsing, setParsing] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [rows, setRows] = React.useState<ExtractedRow[] | null>(null);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);

  async function onParse() {
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    if (hint.trim()) fd.append("hint", hint.trim());
    if (accountHint) fd.append("account_id", accountHint);

    setParsing(true);
    try {
      const res = await fetch("/api/ai/parse-statement", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Parse failed", { description: data.error });
        return;
      }
      setRows(data.rows ?? []);
      setSummary(data.source_summary ?? null);
      setIssues(data.issues ?? []);
      if (!data.rows?.length) {
        toast.warning("No transactions found.");
      } else {
        toast.success(`Extracted ${data.rows.length} transactions`, {
          description: data.source_summary ?? undefined,
        });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setParsing(false);
    }
  }

  function updateRow<K extends keyof ExtractedRow>(
    idx: number,
    key: K,
    val: ExtractedRow[K]
  ) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function onCommit() {
    if (!rows || rows.length === 0) {
      toast.error("Nothing to save.");
      return;
    }
    for (const r of rows) {
      if (!r.account_id) {
        toast.error("Every row needs an account.");
        return;
      }
      if (r.transaction_type === "transfer" && !r.to_account_id) {
        toast.error("Transfer rows need a 'to' account.");
        return;
      }
      if (!(r.amount > 0)) {
        toast.error("Amounts must be positive.");
        return;
      }
    }
    setCommitting(true);
    try {
      const payload = {
        rows: rows.map((r) => ({
          transaction_date: r.transaction_date,
          account_id: r.account_id,
          category: r.category.trim() || "Uncategorized",
          amount: r.amount,
          transaction_type: r.transaction_type,
          note: r.note?.trim() || null,
          description: r.description?.trim() || null,
          to_account_id:
            r.transaction_type === "transfer" ? r.to_account_id ?? null : null,
        })),
      };
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Save failed", { description: data.error });
        return;
      }
      toast.success(`Saved ${data.inserted} transactions`);
      setFile(null);
      setRows(null);
      setSummary(null);
      setIssues([]);
      onCommitted();
    } catch {
      toast.error("Network error");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" /> Back
        </button>
        <h1 className="font-heading text-lg font-semibold ml-2 inline-flex items-center gap-2">
          <Sparkles className="size-4" /> AI statement import
        </h1>
      </header>

      {!rows && (
        <div className="border-border/60 bg-card/40 grid gap-3 rounded-lg border p-3 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="stmt-file">Document</Label>
            <Input
              id="stmt-file"
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-[11px]">
              PDF, image (PNG/JPG), CSV, or TXT. Max 12MB.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stmt-acc">Assume this is for account (optional)</Label>
            <select
              id="stmt-acc"
              className="border-input bg-background h-9 w-full rounded-md border px-2"
              value={accountHint}
              onChange={(e) => setAccountHint(e.target.value)}
            >
              <option value="">— auto-detect —</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stmt-hint">Hint (optional)</Label>
            <Input
              id="stmt-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder='e.g. "BPI checking, March 2026"'
            />
          </div>
          <Button onClick={onParse} disabled={!file || parsing}>
            {parsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Extract with AI
          </Button>
        </div>
      )}

      {rows && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {summary && (
            <Alert>
              <FileText className="size-4" />
              <AlertTitle>{file?.name ?? "Document"}</AlertTitle>
              <AlertDescription>{summary}</AlertDescription>
            </Alert>
          )}

          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Review flagged by AI</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-xs">
                  {issues.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-muted-foreground text-xs">
              {rows.length} row{rows.length === 1 ? "" : "s"} · edit then save
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows(null);
                  setSummary(null);
                  setIssues([]);
                }}
                disabled={committing}
              >
                Re-upload
              </Button>
              <Button size="sm" onClick={onCommit} disabled={committing || rows.length === 0}>
                {committing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save all
              </Button>
            </div>
          </div>

          <ScrollArea className="border-border/60 min-h-[40vh] flex-1 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[110px] text-right">Amount</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const conf = r.confidence ?? 1;
                  const confColor =
                    conf >= 0.75
                      ? ""
                      : conf >= 0.5
                        ? "bg-amber-500/15"
                        : "bg-destructive/10";
                  return (
                    <TableRow key={i} className={confColor}>
                      <TableCell>
                        <Input
                          type="date"
                          value={r.transaction_date}
                          onChange={(e) =>
                            updateRow(i, "transaction_date", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="border-input bg-background h-8 w-full rounded-md border px-1 text-xs"
                          value={r.transaction_type}
                          onChange={(e) =>
                            updateRow(i, "transaction_type", e.target.value as TxType)
                          }
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <select
                            className="border-input bg-background h-8 w-full rounded-md border px-1 text-xs"
                            value={r.account_id}
                            onChange={(e) => updateRow(i, "account_id", e.target.value)}
                          >
                            {accounts.map((a) => (
                              <option key={a.account_id} value={a.account_id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          {r.transaction_type === "transfer" && (
                            <select
                              className="border-input bg-background h-8 w-full rounded-md border px-1 text-xs"
                              value={r.to_account_id ?? ""}
                              onChange={(e) =>
                                updateRow(i, "to_account_id", e.target.value || null)
                              }
                            >
                              <option value="">→ to account</option>
                              {accounts
                                .filter((a) => a.account_id !== r.account_id)
                                .map((a) => (
                                  <option key={a.account_id} value={a.account_id}>
                                    → {a.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.category}
                          onChange={(e) => updateRow(i, "category", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.description ?? ""}
                          onChange={(e) => updateRow(i, "description", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          inputMode="decimal"
                          value={String(r.amount)}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value.replace(/,/g, ""));
                            updateRow(i, "amount", Number.isFinite(n) && n > 0 ? n : r.amount);
                          }}
                          className="h-8 text-right text-xs tabular-nums"
                        />
                        {r.confidence !== undefined && r.confidence < 0.75 && (
                          <Badge className="mt-1 text-[10px]" variant="outline">
                            {(r.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove row"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
