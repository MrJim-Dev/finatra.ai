import {
  type RawExcelRow,
  flowTypeToTransactionType,
} from '@/lib/import/excel-import';

/** Unique account labels from an import (primary + transfer counterparties). */
export function collectImportAccountNames(rows: RawExcelRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const tt = flowTypeToTransactionType(r.flowType);
    if (!tt) continue;
    if (r.accountName.trim()) set.add(r.accountName.trim());
    if (tt === 'transfer' && r.categoryCol.trim())
      set.add(r.categoryCol.trim());
  }
  return Array.from(set);
}
