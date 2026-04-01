import * as XLSX from 'xlsx';
import { formatCellForLog } from '@/lib/format-cell-for-log';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type RawExcelRow = {
  rowIndex: number;
  /** Excel serial date; ignored when `isoDate` is set (e.g. Money Manager `.mmbak`). */
  period: number;
  /** `YYYY-MM-DD` from non-Excel sources */
  isoDate?: string;
  accountName: string;
  categoryCol: string;
  subcategory: string;
  note: string;
  flowType: string;
  description: string;
  amount: number;
  currency: string;
  /** Money Manager `ZUID` on `ZINOUTCOME` — links tags via `ZTXTAG.ZTXUID`. */
  mmZUid?: string | null;
  /** Money Manager `ZCATEGORYUID` — maps to imported category catalog. */
  mmCategoryUid?: string | null;
  /** `ZAMOUNTACCOUNT` when it differs from display amount (multi-currency). */
  amountInAccountCurrency?: number | null;
  /** `ZAMOUNTSUB` when present. */
  amountSub?: number | null;
  /** `ZISDEL` — row is imported but soft-deleted like in MM. */
  mmSoftDeleted?: boolean;
  /** Structured MM fields (fees, card/installment, etc.). */
  mmMeta?: Record<string, unknown>;
};

export type ParsedExcelResult = {
  sheetName: string;
  header: string[];
  rows: RawExcelRow[];
  parseWarnings: string[];
};

/** Excel 1900 date serial to UTC ISO string (midday to avoid DST edge cases). */
export function excelSerialToIsoDate(serial: number): string {
  if (!Number.isFinite(serial)) {
    return new Date().toISOString().slice(0, 10);
  }
  const utcMs = (serial - 25569) * 86400 * 1000;
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function parseAmount(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.abs(v);
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, '').trim());
    return Number.isFinite(n) ? Math.abs(n) : NaN;
  }
  return NaN;
}

function parsePeriod(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

export function flowTypeToTransactionType(flow: string): TransactionType | null {
  const t = flow.trim().toLowerCase();
  if (t === 'exp.' || t === 'expense' || t.startsWith('expense'))
    return 'expense';
  if (t === 'income' || t.startsWith('income')) return 'income';
  if (t === 'transfer-in' || t === 'transfer-out' || t.startsWith('transfer'))
    return 'transfer';
  return null;
}

export function buildCategoryLabel(
  type: TransactionType,
  categoryCol: string,
  subcategory: string
): string {
  const c = categoryCol.trim();
  const s = subcategory.trim();
  if (type === 'transfer') {
    if (s)
      return `${c} / ${s}`.replace(/^\/\s*|\/\s*$/g, '').trim() || c || 'Transfer';
    return c || 'Transfer';
  }
  if (c && s) return `${c} / ${s}`;
  return c || s || 'Uncategorized';
}

export async function parseFinanceWorkbook(file: File): Promise<ParsedExcelResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0] ?? 'Sheet1';
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return {
      sheetName,
      header: [],
      rows: [],
      parseWarnings: ['No worksheet found in the file.'],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  const parseWarnings: string[] = [];
  if (matrix.length < 2) {
    parseWarnings.push('The sheet has no data rows.');
    return { sheetName, header: [], rows: [], parseWarnings };
  }

  const header = (matrix[0] ?? []).map((c) => String(c).trim());
  const rows: RawExcelRow[] = [];
  let skippedBlankFlow = 0;

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i] ?? [];
    const flowType = String(r[6] ?? '').trim();
    if (!flowType) {
      skippedBlankFlow += 1;
      continue;
    }

    const period = parsePeriod(r[0]);
    const amount = parseAmount(r[8]);
    const accountName = String(r[1] ?? '').trim();

    if (!accountName && flowType) {
      const rawAcc = formatCellForLog(r[1]);
      parseWarnings.push(
        `Row ${i + 1} (Excel row ${i + 1}): missing primary account in column B (Accounts). Raw cell: ${rawAcc}. Flow type: ${formatCellForLog(flowType)}. Row skipped.`
      );
      continue;
    }
    const rawAmountCell = r[8];
    if (!Number.isFinite(amount)) {
      parseWarnings.push(
        `Row ${i + 1} (Excel row ${i + 1}): amount column I is not a valid number. Raw value: ${formatCellForLog(rawAmountCell)} (parsed: NaN or non-numeric). Account: ${formatCellForLog(accountName)}. Flow: ${formatCellForLog(flowType)}. Row skipped.`
      );
      continue;
    }
    if (amount === 0) {
      parseWarnings.push(
        `Row ${i + 1} (Excel row ${i + 1}): amount is zero. Column I raw: ${formatCellForLog(rawAmountCell)}. Account: ${formatCellForLog(accountName)}. Flow: ${formatCellForLog(flowType)}. Row skipped.`
      );
      continue;
    }

    const tt = flowTypeToTransactionType(flowType);
    if (!tt) {
      parseWarnings.push(
        `Row ${i + 1} (Excel row ${i + 1}): unknown flow type in column G (Income/Expense). Value: ${formatCellForLog(flowType)}. Expected something like Exp., Income, Transfer-In, Transfer-Out. Account: ${formatCellForLog(accountName)}. Amount: ${formatCellForLog(rawAmountCell)}. Row skipped.`
      );
      continue;
    }

    const flowNorm = flowType.trim().toLowerCase();
    if (flowNorm === 'transfer-in' || flowNorm.startsWith('transfer-in')) {
      parseWarnings.push(
        `Row ${i + 1} (Excel row ${i + 1}): skipped Transfer-In mirror leg; use Transfer-Out for each transfer so balances stay correct. Account: ${formatCellForLog(accountName)}.`
      );
      continue;
    }

    rows.push({
      rowIndex: i + 1,
      period: Number.isFinite(period) ? period : 0,
      accountName,
      categoryCol: String(r[2] ?? '').trim(),
      subcategory: String(r[3] ?? '').trim(),
      note: String(r[4] ?? '').trim(),
      flowType,
      description: String(r[7] ?? '').trim(),
      amount,
      currency: String(r[9] ?? '').trim() || '—',
    });
  }

  if (skippedBlankFlow > 0) {
    parseWarnings.push(
      `Skipped ${skippedBlankFlow} spreadsheet row(s) with an empty flow type (column G — Income/Expense). These are usually blank lines at the end of the sheet.`
    );
  }

  return { sheetName, header, rows, parseWarnings };
}
