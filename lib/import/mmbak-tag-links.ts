import type { DraftTransactionRow } from '@/lib/import/draft-from-excel';

/** Map MM `ZTXTAG` links to Finatra `transaction_id`s (draft row ids). */
export function tagLinksForImportChunk(
  drafts: DraftTransactionRow[],
  mmLinks: { z_tx_uid: string; z_tag_uid: string }[],
  chunkTransactionIds: Set<string>
): { transaction_id: string; tag_mm_uid: string }[] {
  const uidToTid = new Map<string, string>();
  for (const d of drafts) {
    if (d.issues.length > 0) continue;
    const z = d.raw.mmZUid?.trim();
    if (z) uidToTid.set(z, d.id);
  }
  const out: { transaction_id: string; tag_mm_uid: string }[] = [];
  for (const l of mmLinks) {
    const tid = uidToTid.get(l.z_tx_uid.trim());
    if (tid && chunkTransactionIds.has(tid)) {
      out.push({
        transaction_id: tid,
        tag_mm_uid: l.z_tag_uid.trim(),
      });
    }
  }
  return out;
}
