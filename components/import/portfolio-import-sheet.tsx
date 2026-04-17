'use client';

import * as React from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import {
  parseFinanceWorkbook,
  type RawExcelRow,
} from '@/lib/import/excel-import';
import {
  rawRowsToDrafts,
  type DraftTransactionRow,
} from '@/lib/import/draft-from-excel';
import type { AccountGroupRow, AccountOption } from '@/lib/import/account-match';
import {
  enrichDraftRow,
  enrichAllDrafts,
} from '@/lib/import/enrich-draft';
import { collectImportAccountNames } from '@/lib/import/import-account-names';
import type {
  ImportStructurePreview,
  MmbakAccountSpec,
} from '@/lib/import/mmbak-structure';
import { ImportStructurePreviewCard } from '@/components/import/import-structure-preview';
import { ImportPreviewAnalytics } from '@/components/import/import-preview-analytics';
import { MmbakImportOverview } from '@/components/import/mmbak-import-overview';
import { PortfolioResetPanel } from '@/components/import/portfolio-reset-panel';
import type { MmbakExtensionPayload } from '@/lib/import/mmbak-extension';
import { tagLinksForImportChunk } from '@/lib/import/mmbak-tag-links';
import { MmStatementUpload } from '@/components/mm-statement-upload';

const PAGE_SIZE = 40;
const COMMIT_BATCH = 8000;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onDataChanged: () => void | Promise<void>;
};

export function PortfolioImportSheet({
  open,
  onOpenChange,
  portfolioId,
  onDataChanged,
}: Props) {
  const { toast } = useToast();
  const [section, setSection] = React.useState<'import' | 'ai-parse' | 'reset'>('import');
  const [importStep, setImportStep] = React.useState<'idle' | 'preview'>(
    'idle'
  );
  const [parseMeta, setParseMeta] = React.useState<{
    fileName: string;
    sheetName: string;
    warnings: string[];
    source: 'excel' | 'mmbak';
    structure?: ImportStructurePreview;
  } | null>(null);
  const [mmbakExtension, setMmbakExtension] =
    React.useState<MmbakExtensionPayload | null>(null);
  const [drafts, setDrafts] = React.useState<DraftTransactionRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [importGroups, setImportGroups] = React.useState<AccountGroupRow[]>(
    []
  );
  const [parseBusy, setParseBusy] = React.useState(false);
  const [commitBusy, setCommitBusy] = React.useState(false);
  const [commitProgress, setCommitProgress] = React.useState<{
    total: number;
    uploaded: number;
    inFlightRows: number;
    batchIndex: number;
    batchTotal: number;
    lastDetail: string;
  } | null>(null);
  const [previewPage, setPreviewPage] = React.useState(0);
  const [issuesOnly, setIssuesOnly] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mmbakInputRef = React.useRef<HTMLInputElement>(null);

  const resetImportState = React.useCallback(() => {
    setImportStep('idle');
    setDrafts([]);
    setParseMeta(null);
    setMmbakExtension(null);
    setIssuesOnly(false);
    setPreviewPage(0);
    setAccounts([]);
    setImportGroups([]);
    setCommitProgress(null);
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetImportState();
      setSection('import');
    }
  }, [open, resetImportState]);

  const updateRow = React.useCallback(
    (id: string, patch: Partial<DraftTransactionRow>) => {
      setDrafts((prev) =>
        prev.map((r) =>
          r.id === id
            ? enrichDraftRow({ ...r, ...patch }, accounts, portfolioId)
            : r
        )
      );
    },
    [accounts, portfolioId]
  );

  React.useEffect(() => {
    if (accounts.length === 0) return;
    setDrafts((prev) => {
      if (prev.length === 0) return prev;
      return enrichAllDrafts(prev, accounts, portfolioId);
    });
  }, [accounts, portfolioId]);

  async function runImportPipeline(
    rows: RawExcelRow[],
    parseWarnings: string[],
    fileName: string,
    sheetName: string,
    source: 'excel' | 'mmbak',
    mmbakAccountSpecs?: MmbakAccountSpec[] | null,
    structure?: ImportStructurePreview | null,
    extension?: MmbakExtensionPayload | null
  ) {
    if (rows.length === 0) {
      toast({
        title: 'No importable rows found',
        description:
          parseWarnings[0] ??
          (source === 'mmbak'
            ? 'No supported transactions in this backup.'
            : 'Check the file format.'),
        variant: 'destructive',
      });
      resetImportState();
      return;
    }

    const importNames = collectImportAccountNames(rows);
    const specs =
      source === 'mmbak' && mmbakAccountSpecs && mmbakAccountSpecs.length > 0
        ? mmbakAccountSpecs
        : null;
    const ensureBody = specs
      ? { port_id: portfolioId, accounts: specs }
      : { port_id: portfolioId, names: importNames };

    const ensureRes = await fetch('/api/accounts/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ensureBody),
    });
    const ensureJson = await ensureRes.json();
    if (!ensureRes.ok) {
      toast({
        title: 'Could not prepare accounts',
        description: ensureJson.error ?? ensureRes.statusText,
        variant: 'destructive',
      });
      return;
    }

    const nextAccounts: AccountOption[] = ensureJson.accounts ?? [];
    setAccounts(nextAccounts);
    setImportGroups(
      Array.isArray(ensureJson.groups)
        ? (ensureJson.groups as AccountGroupRow[])
        : []
    );

    const mapped = rawRowsToDrafts(rows, nextAccounts);
    const enriched = enrichAllDrafts(mapped, nextAccounts, portfolioId);

    setDrafts(enriched);
    setParseMeta({
      fileName,
      sheetName,
      warnings: parseWarnings,
      source,
      structure: structure ?? undefined,
    });
    setMmbakExtension(source === 'mmbak' && extension ? extension : null);
    setImportStep('preview');

    const created: string[] = ensureJson.created ?? [];
    const createdGroups: string[] = Array.isArray(ensureJson.createdGroups)
      ? ensureJson.createdGroups
      : [];
    const issueCount = enriched.filter((r) => r.issues.length > 0).length;
    const warnCount = parseWarnings.length;
    const sourceNote =
      source === 'mmbak'
        ? 'Money Manager backup notes (skipped / odd rows). '
        : 'Spreadsheet notes (skipped rows, blanks, etc.). ';
    const groupNote =
      createdGroups.length > 0
        ? `Created ${createdGroups.length} new account group(s). `
        : '';
    toast({
      title: `Parsed ${enriched.length} importable rows`,
      description:
        (warnCount > 0 ? `${warnCount} ${sourceNote}` : '') +
        groupNote +
        (created.length > 0
          ? `Created ${created.length} new account(s). `
          : '') +
        (issueCount > 0
          ? `${issueCount} row(s) still need fixes.`
          : 'Review Summary, edit rows if needed, then confirm import.'),
    });
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setParseBusy(true);
    setPreviewPage(0);
    try {
      const parsed = await parseFinanceWorkbook(file);
      await runImportPipeline(
        parsed.rows,
        parsed.parseWarnings,
        file.name,
        parsed.sheetName,
        'excel',
        null,
        null,
        null
      );
    } catch (err) {
      toast({
        title: 'Could not read the spreadsheet',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setParseBusy(false);
    }
  };

  const onPickMmbak = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setParseBusy(true);
    setPreviewPage(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import/parse-mmbak', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Could not read Money Manager backup',
          description: data.error ?? res.statusText,
          variant: 'destructive',
        });
        return;
      }
      await runImportPipeline(
        data.rows ?? [],
        data.parseWarnings ?? [],
        file.name,
        data.sheetName ?? 'Money Manager (.mmbak)',
        'mmbak',
        data.accountSpecs ?? null,
        data.structure ?? null,
        data.mmbakExtension ?? null
      );
    } catch (err) {
      toast({
        title: 'Money Manager import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setParseBusy(false);
    }
  };

  const filteredDrafts = React.useMemo(() => {
    if (!issuesOnly) return drafts;
    return drafts.filter((r) => r.issues.length > 0);
  }, [drafts, issuesOnly]);

  const pageCount = Math.max(1, Math.ceil(filteredDrafts.length / PAGE_SIZE));
  const safePage = Math.min(previewPage, pageCount - 1);
  const pageRows = filteredDrafts.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const validCount = drafts.filter((r) => r.issues.length === 0).length;
  const issueRowsCount = drafts.filter((r) => r.issues.length > 0).length;

  const commitPayload = React.useCallback(() => {
    return drafts
      .filter((r) => r.issues.length === 0)
      .map((r) => ({
        transaction_id: r.id,
        transaction_date: r.transaction_date,
        account_id: r.account_id!,
        category: r.category,
        amount: parseFloat(r.amount.replace(/,/g, '')),
        transaction_type: r.transaction_type,
        note: r.note || null,
        description: r.description || null,
        to_account_id:
          r.transaction_type === 'transfer' ? r.to_account_id : null,
        currency: r.currency?.trim() || null,
        category_mm_uid: r.category_mm_uid,
        deleted_at: r.deleted_at,
        amount_in_account_currency: r.amount_in_account_currency,
        mm_meta: r.mm_meta ?? undefined,
      }));
  }, [drafts]);

  const onConfirmImport = async () => {
    const rows = commitPayload();
    if (rows.length === 0) {
      toast({
        title: 'Nothing to import',
        description: 'Fix validation issues or map all accounts.',
        variant: 'destructive',
      });
      return;
    }

    setCommitBusy(true);
    const batchTotal = Math.max(1, Math.ceil(rows.length / COMMIT_BATCH));
    setCommitProgress({
      total: rows.length,
      uploaded: 0,
      inFlightRows: 0,
      batchIndex: 0,
      batchTotal,
      lastDetail:
        batchTotal > 1
          ? `Sending ${batchTotal} batch request(s) to the server.`
          : 'Uploading rows…',
    });

    let totalInserted = 0;
    try {
      for (let b = 0; b < batchTotal; b += 1) {
        const start = b * COMMIT_BATCH;
        const chunk = rows.slice(start, start + COMMIT_BATCH);
        setCommitProgress((prev) =>
          prev
            ? {
                ...prev,
                batchIndex: b + 1,
                inFlightRows: chunk.length,
                lastDetail: `Request ${b + 1} of ${batchTotal}: uploading ${chunk.length.toLocaleString()} row(s)…`,
              }
            : null
        );

        const chunkIds = new Set(chunk.map((r) => r.transaction_id));
        const tagLinks =
          mmbakExtension && mmbakExtension.transactionTagLinks.length > 0
            ? tagLinksForImportChunk(
                drafts,
                mmbakExtension.transactionTagLinks,
                chunkIds
              )
            : [];

        const res = await fetch('/api/import/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            port_id: portfolioId,
            rows: chunk,
            ...(b === 0 && mmbakExtension
              ? { mmbak_extension: mmbakExtension }
              : {}),
            ...(tagLinks.length > 0
              ? { transaction_tag_links: tagLinks }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCommitProgress((prev) => (prev ? { ...prev, inFlightRows: 0 } : null));
          toast({
            title: 'Import failed',
            description: data.error ?? res.statusText,
            variant: 'destructive',
          });
          return;
        }
        totalInserted += data.inserted ?? 0;
        setCommitProgress((prev) =>
          prev
            ? {
                ...prev,
                uploaded: totalInserted,
                inFlightRows: 0,
                lastDetail: `Saved ${(data.inserted ?? chunk.length).toLocaleString()} rows.`,
              }
            : null
        );

        if (data.warnings?.length) {
          toast({
            title: 'Partial warning',
            description: String(data.warnings),
          });
        }
      }
      toast({
        title: `Imported ${totalInserted.toLocaleString()} transactions`,
      });
      resetImportState();
      onOpenChange(false);
      await onDataChanged();
    } catch {
      toast({
        title: 'Network error during import',
        variant: 'destructive',
      });
    } finally {
      setCommitBusy(false);
      setCommitProgress(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden sm:max-w-4xl lg:max-w-6xl"
      >
        <SheetHeader className="shrink-0 pr-8 text-left">
          <SheetTitle>Import &amp; reset</SheetTitle>
          <SheetDescription>
            Upload Excel or a Money Manager backup, preview and edit, then
            confirm. MM backups also carry budgets, tags, templates, and
            settings—those are saved on import when present. Reset clears
            transactions, those extras, and this portfolio&apos;s accounts.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={section}
          onValueChange={(v) => setSection(v as 'import' | 'ai-parse' | 'reset')}
          className="flex min-h-0 flex-1 flex-col gap-3 px-1"
        >
          <TabsList className="grid w-full shrink-0 grid-cols-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="ai-parse" className="gap-1">
              <Sparkles className="size-3.5" />
              AI Parse
            </TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>

          <TabsContent
            value="import"
            className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            <ScrollArea className="min-h-0 flex-1 pr-3">
              <Card className="mb-4 border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="size-5" />
                    Import data
                  </CardTitle>
                  <CardDescription>
                    <strong>Excel:</strong> Period, Accounts, Category, …,
                    Income/Expense, Amount. <strong>Money Manager:</strong>{' '}
                    <code className="text-xs">.mmbak</code> backup — each
                    transfer is stored twice (outgoing and incoming); we import
                    one row per transfer so accounts are not double-counted.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={onPickFile}
                  />
                  <input
                    ref={mmbakInputRef}
                    type="file"
                    accept=".mmbak,application/octet-stream"
                    className="sr-only"
                    onChange={onPickMmbak}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={parseBusy}
                      className="gap-2"
                      onClick={() => {
                        setImportStep('idle');
                        setDrafts([]);
                        setParseMeta(null);
                        setMmbakExtension(null);
                        setIssuesOnly(false);
                        setPreviewPage(0);
                        setAccounts([]);
                        setImportGroups([]);
                      }}
                    >
                      Reset import
                    </Button>
                  </div>
                  {importStep === 'idle' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        disabled={parseBusy}
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {parseBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {parseBusy ? 'Reading…' : 'Excel (.xlsx)'}
                      </Button>
                      <Button
                        disabled={parseBusy}
                        variant="secondary"
                        className="gap-2"
                        onClick={() => mmbakInputRef.current?.click()}
                      >
                        {parseBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Database className="size-4" />
                        )}
                        Money Manager (.mmbak)
                      </Button>
                    </div>
                  )}
                  {importStep === 'preview' && parseMeta && (
                    <div className="flex flex-col gap-4 pb-6">
                      <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                        <CheckCircle2 className="text-primary size-4 shrink-0" />
                        <span>
                          <strong>{parseMeta.fileName}</strong> — sheet{' '}
                          <code className="text-xs">{parseMeta.sheetName}</code>
                          , <strong>{drafts.length}</strong> rows
                        </span>
                        <Badge variant="secondary" className="tabular-nums">
                          {validCount} ready
                        </Badge>
                        {issueRowsCount > 0 && (
                          <Badge variant="destructive" className="tabular-nums">
                            {issueRowsCount} need fixes
                          </Badge>
                        )}
                      </div>
                      {mmbakExtension && (
                        <div className="bg-muted/30 rounded-lg border p-3 text-xs leading-relaxed text-muted-foreground">
                          <p className="text-foreground mb-1 font-medium text-sm">
                            Also loaded from backup (applied on first commit
                            batch)
                          </p>
                          <ul className="list-inside list-disc space-y-0.5">
                            <li>
                              Category catalog:{' '}
                              {mmbakExtension.categories.length} (linked via
                              ZCATEGORYUID)
                            </li>
                            <li>
                              Tags + links: {mmbakExtension.tags.length} tags,{' '}
                              {mmbakExtension.transactionTagLinks.length} tx↔tag
                              links
                            </li>
                            <li>
                              Budgets: {mmbakExtension.budgets.length} with{' '}
                              {mmbakExtension.budgetAmounts.length} amount line(s)
                            </li>
                            <li>
                              Recurring / favorite templates:{' '}
                              {mmbakExtension.recurringTemplates.length} /{' '}
                              {mmbakExtension.favoriteTemplates.length}
                            </li>
                            <li>
                              App settings snapshot:{' '}
                              {mmbakExtension.portfolioKv.length} key/value pair
                              {mmbakExtension.portfolioKv.length === 1 ? '' : 's'}{' '}
                              + {mmbakExtension.standaloneMemos.length} memo row(s)
                            </li>
                            <li>
                              Transactions: fee + card fields in{' '}
                              <code className="text-[11px]">mm_meta</code>,{' '}
                              <code className="text-[11px]">
                                amount_in_account_currency
                              </code>{' '}
                              when MM split currencies; soft-deleted MM rows get{' '}
                              <code className="text-[11px]">deleted_at</code>{' '}
                              (hidden in the main list).
                            </li>
                          </ul>
                        </div>
                      )}
                      {parseMeta.warnings.length > 0 && (
                        <div
                          role="alert"
                          className="border-destructive/50 bg-destructive/5 rounded-lg border p-4"
                        >
                          <div className="flex gap-2">
                            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-sm font-medium leading-none">
                                {parseMeta.source === 'mmbak'
                                  ? `Backup parse notes (${parseMeta.warnings.length})`
                                  : `Spreadsheet notes (${parseMeta.warnings.length})`}
                              </p>
                              <ScrollArea className="max-h-96 rounded-md border bg-muted/30 p-2">
                                <ul className="list-disc space-y-2 pl-4 text-xs">
                                  {parseMeta.warnings
                                    .slice(0, 120)
                                    .map((w, i) => (
                                      <li key={i} className="leading-snug">
                                        {w}
                                      </li>
                                    ))}
                                </ul>
                              </ScrollArea>
                            </div>
                          </div>
                        </div>
                      )}
                      <Tabs defaultValue="summary" className="gap-4">
                        <TabsList
                          className={
                            parseMeta.structure
                              ? 'grid w-full grid-cols-3'
                              : 'grid w-full grid-cols-2'
                          }
                        >
                          <TabsTrigger value="summary">
                            Summary &amp; totals
                          </TabsTrigger>
                          {parseMeta.structure ? (
                            <TabsTrigger value="structure">
                              Backup map
                            </TabsTrigger>
                          ) : null}
                          <TabsTrigger value="rows">Edit rows</TabsTrigger>
                        </TabsList>
                        <TabsContent value="summary" className="mt-4">
                          <ImportPreviewAnalytics
                            drafts={drafts}
                            accounts={accounts}
                            companionMmbakOverview={
                              parseMeta.source === 'mmbak'
                            }
                          />
                          {parseMeta.source === 'mmbak' ? (
                            <MmbakImportOverview
                              accounts={accounts}
                              groups={importGroups}
                              extension={mmbakExtension}
                              drafts={drafts}
                              structure={parseMeta.structure ?? null}
                            />
                          ) : null}
                        </TabsContent>
                        {parseMeta.structure ? (
                          <TabsContent value="structure" className="mt-4">
                            <ImportStructurePreviewCard
                              structure={parseMeta.structure}
                            />
                          </TabsContent>
                        ) : null}
                        <TabsContent
                          value="rows"
                          className="mt-4 flex flex-col gap-3"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <Label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={issuesOnly}
                                onChange={(e) => {
                                  setIssuesOnly(e.target.checked);
                                  setPreviewPage(0);
                                }}
                                className="border-input rounded"
                              />
                              Issues only
                            </Label>
                            <span className="text-muted-foreground text-xs">
                              Page {safePage + 1} / {pageCount}
                            </span>
                          </div>
                          <ScrollArea className="h-[min(420px,50vh)] rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10">#</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Account</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Note</TableHead>
                                  <TableHead className="text-right">
                                    Amt
                                  </TableHead>
                                  <TableHead className="w-[3.25rem]">CCY</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>To</TableHead>
                                  <TableHead>OK</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pageRows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-muted-foreground text-xs">
                                      {row.raw.rowIndex}
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="date"
                                        className="h-8 w-[9rem] text-xs"
                                        value={row.transaction_date}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            transaction_date: e.target.value,
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <select
                                        className="border-input bg-background h-8 max-w-[140px] rounded-md border px-1 text-xs"
                                        value={row.account_id ?? ''}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            account_id: e.target.value || null,
                                          })
                                        }
                                      >
                                        <option value="">—</option>
                                        {accounts.map((a) => (
                                          <option
                                            key={a.account_id}
                                            value={a.account_id}
                                          >
                                            {a.name}
                                          </option>
                                        ))}
                                      </select>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 min-w-[100px] text-xs"
                                        value={row.category}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            category: e.target.value,
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 min-w-[80px] text-xs"
                                        value={row.note}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            note: e.target.value,
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 w-20 text-right text-xs tabular-nums"
                                        inputMode="decimal"
                                        value={row.amount}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            amount: e.target.value,
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 w-11 text-xs uppercase"
                                        placeholder="·"
                                        title="ISO currency (optional)"
                                        value={row.currency ?? ''}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            currency:
                                              e.target.value.trim() || null,
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <select
                                        className="border-input bg-background h-8 rounded-md border px-1 text-xs"
                                        value={row.transaction_type}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            transaction_type: e.target
                                              .value as DraftTransactionRow['transaction_type'],
                                            to_account_id:
                                              e.target.value === 'transfer'
                                                ? row.to_account_id
                                                : null,
                                          })
                                        }
                                      >
                                        <option value="expense">exp</option>
                                        <option value="income">inc</option>
                                        <option value="transfer">xfer</option>
                                      </select>
                                    </TableCell>
                                    <TableCell>
                                      {row.transaction_type === 'transfer' ? (
                                        <select
                                          className="border-input bg-background h-8 max-w-[120px] rounded-md border px-1 text-xs"
                                          value={row.to_account_id ?? ''}
                                          onChange={(e) =>
                                            updateRow(row.id, {
                                              to_account_id:
                                                e.target.value || null,
                                            })
                                          }
                                        >
                                          <option value="">—</option>
                                          {accounts.map((a) => (
                                            <option
                                              key={a.account_id}
                                              value={a.account_id}
                                            >
                                              {a.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {row.issues.length === 0 ? (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px]"
                                        >
                                          OK
                                        </Badge>
                                      ) : (
                                        <span className="text-destructive text-[9px]">
                                          !
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                          <div className="flex flex-wrap gap-2 border-t pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={safePage <= 0}
                              onClick={() =>
                                setPreviewPage((p) => Math.max(0, p - 1))
                              }
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={safePage >= pageCount - 1}
                              onClick={() =>
                                setPreviewPage((p) =>
                                  Math.min(pageCount - 1, p + 1)
                                )
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                      {commitBusy && commitProgress && (
                        <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">Importing</span>
                            <span className="text-muted-foreground tabular-nums">
                              {commitProgress.uploaded.toLocaleString()} /{' '}
                              {commitProgress.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-muted relative h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full transition-[width] duration-300"
                              style={{
                                width: `${commitProgress.total > 0 ? Math.min(100, Math.round((commitProgress.uploaded / commitProgress.total) * 100)) : 0}%`,
                              }}
                            />
                            {commitProgress.inFlightRows > 0 ? (
                              <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {commitProgress.lastDetail}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportStep('idle');
                            setDrafts([]);
                            setParseMeta(null);
                            setMmbakExtension(null);
                            setIssuesOnly(false);
                            setAccounts([]);
                          }}
                          disabled={commitBusy}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="gap-2"
                          disabled={commitBusy || validCount === 0}
                          onClick={onConfirmImport}
                        >
                          {commitBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArrowRight className="size-4" />
                          )}
                          Confirm ({validCount})
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="ai-parse"
            className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-[calc(100vh-12rem)] pr-3">
              <MmStatementUpload
                accounts={accounts.length > 0 ? accounts : []}
                onBack={() => setSection('import')}
                onCommitted={async () => {
                  resetImportState();
                  await onDataChanged();
                }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="reset"
            className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-[calc(100vh-12rem)] pr-3">
              <PortfolioResetPanel
                portId={portfolioId}
                onResetComplete={async () => {
                  resetImportState();
                  await onDataChanged();
                }}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
