import {
  type RawExcelRow,
  type TransactionType,
  excelSerialToIsoDate,
  flowTypeToTransactionType,
  buildCategoryLabel,
} from '@/lib/import/excel-import';
import { matchAccount, type AccountOption } from '@/lib/import/account-match';
import { normalizeCurrencyCode } from '@/lib/import/mmbak-sqlite-meta';

export type DraftTransactionRow = {
  id: string;
  raw: RawExcelRow;
  transaction_date: string;
  account_id: string | null;
  to_account_id: string | null;
  category: string;
  note: string;
  description: string;
  amount: string;
  transaction_type: TransactionType;
  /** Transaction currency (from import); commit uses account/portfolio default when null */
  currency: string | null;
  port_id: string | null;
  uid: string | null;
  issues: string[];
  /** MM `ZCATEGORYUID` for server-side `categories.mm_uid` lookup */
  category_mm_uid: string | null;
  /** ISO timestamp when MM marked row deleted (`ZISDEL`) */
  deleted_at: string | null;
  amount_in_account_currency: number | null;
  mm_meta: Record<string, unknown> | null;
};

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function rawRowsToDrafts(
  rawRows: RawExcelRow[],
  accounts: AccountOption[]
): DraftTransactionRow[] {
  return rawRows.map((raw) => {
    const transaction_type = flowTypeToTransactionType(raw.flowType)!;
    const transaction_date =
      raw.isoDate && /^\d{4}-\d{2}-\d{2}/.test(raw.isoDate)
        ? raw.isoDate.slice(0, 10)
        : raw.period > 0
          ? excelSerialToIsoDate(raw.period)
          : new Date().toISOString().slice(0, 10);

    const category = buildCategoryLabel(
      transaction_type,
      raw.categoryCol,
      raw.subcategory
    );

    const rowCurrency = normalizeCurrencyCode(raw.currency);

    const primary = matchAccount(raw.accountName, accounts);
    let to_account_id: string | null = null;
    let uid: string | null = primary?.user_id ?? null;
    let port_id: string | null = primary?.port_id ?? null;

    if (transaction_type === 'transfer' && raw.categoryCol.trim()) {
      const counter = matchAccount(raw.categoryCol, accounts);
      if (counter) {
        to_account_id = counter.account_id;
        if (!uid) uid = counter.user_id;
        if (!port_id) port_id = counter.port_id;
      }
    }

    const issues: string[] = [];
    if (!primary) issues.push(`Unmapped account: "${raw.accountName}"`);
    if (
      transaction_type === 'transfer' &&
      raw.categoryCol.trim() &&
      !to_account_id
    ) {
      issues.push(`Unmapped transfer counterparty: "${raw.categoryCol}"`);
    }
    if (!port_id || !uid) issues.push('Missing portfolio or user (pick accounts)');

    const deleted_at = raw.mmSoftDeleted
      ? `${transaction_date}T12:00:00.000Z`
      : null;
    const aac = raw.amountInAccountCurrency;
    const amount_in_account_currency =
      typeof aac === 'number' && Number.isFinite(aac) ? Math.abs(aac) : null;

    return {
      id: newId(),
      raw,
      transaction_date,
      account_id: primary?.account_id ?? null,
      to_account_id,
      category,
      note: raw.note,
      description: raw.description,
      amount: String(raw.amount),
      transaction_type,
      currency: rowCurrency,
      port_id,
      uid,
      issues,
      category_mm_uid: raw.mmCategoryUid?.trim() || null,
      deleted_at,
      amount_in_account_currency,
      mm_meta: raw.mmMeta && typeof raw.mmMeta === 'object' ? raw.mmMeta : null,
    };
  });
}
