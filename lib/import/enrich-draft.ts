import type { DraftTransactionRow } from '@/lib/import/draft-from-excel';
import type { AccountOption } from '@/lib/import/account-match';
import { normalizeCurrencyCode } from '@/lib/import/mmbak-sqlite-meta';

function rowLabel(row: DraftTransactionRow) {
  return `Sheet row ${row.raw.rowIndex}`;
}

export function enrichDraftRow(
  row: DraftTransactionRow,
  accounts: AccountOption[],
  expectedPortId?: string | null
): DraftTransactionRow {
  const primary = accounts.find((a) => a.account_id === row.account_id);
  const issues: string[] = [];
  const L = rowLabel(row);

  if (!row.account_id) {
    issues.push(
      `${L}: No account selected in the grid. Excel had primary account name: "${row.raw.accountName}".`
    );
  } else if (!primary) {
    issues.push(
      `${L}: Selected account_id is not in the list (stale reference). Try picking the account again.`
    );
  }

  if (row.transaction_type === 'transfer') {
    if (!row.to_account_id) {
      issues.push(
        `${L}: Transfer needs a counterparty account. Excel category column had: "${row.raw.categoryCol}".`
      );
    } else if (row.to_account_id === row.account_id) {
      issues.push(`${L}: From and to accounts must differ (both are the same).`);
    }
  }

  const rawAmt = row.amount.trim();
  const amt = parseFloat(rawAmt.replace(/,/g, ''));
  if (!Number.isFinite(amt)) {
    issues.push(
      `${L}: Amount is not a number. Current value: "${rawAmt}". Enter a positive number.`
    );
  } else if (amt <= 0) {
    issues.push(
      `${L}: Amount must be positive. Current value: "${rawAmt}" (parsed: ${amt}).`
    );
  }

  const port_id = primary?.port_id ?? null;
  const uid = primary?.user_id ?? null;
  if (row.account_id && primary && (!port_id || !uid)) {
    issues.push(
      `${L}: Account "${primary.name}" is missing owner (user_id) or portfolio (port_id) in the database.`
    );
  }

  if (
    expectedPortId &&
    primary?.port_id &&
    primary.port_id !== expectedPortId
  ) {
    issues.push(
      `${L}: Account "${primary.name}" belongs to another portfolio; pick an account in this portfolio.`
    );
  }

  const explicitCur = row.currency?.trim();
  const fromRaw = normalizeCurrencyCode(row.raw.currency);
  const fromAccount = primary?.currency?.trim() || null;
  const currency = explicitCur || fromRaw || fromAccount || null;

  return {
    ...row,
    port_id,
    uid,
    currency,
    issues,
  };
}

export function enrichAllDrafts(
  rows: DraftTransactionRow[],
  accounts: AccountOption[],
  expectedPortId?: string | null
): DraftTransactionRow[] {
  return rows.map((r) => enrichDraftRow(r, accounts, expectedPortId));
}
