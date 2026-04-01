import type { RawExcelRow } from '@/lib/import/excel-import';
import { formatCellForLog } from '@/lib/format-cell-for-log';

/** Core Data / Apple reference date (seconds since 2001-01-01 UTC) → ISO date (UTC). */
export function coreDataDateToIso(zdate: number): string | null {
  if (!Number.isFinite(zdate)) return null;
  const unixSec = zdate + 978307200;
  const d = new Date(unixSec * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseTxDateStr(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export type MmbakAssetRow = {
  z_pk: number;
  zuid: string | null;
  znicname: string | null;
  zcard_account_name: string | null;
};

export function assetDisplayName(a: MmbakAssetRow): string {
  const nic = (a.znicname ?? '').trim();
  const card = (a.zcard_account_name ?? '').trim();
  if (/^\d+$/.test(nic) && card) return card;
  if (nic) return nic;
  if (card) return card;
  return 'Unnamed account';
}

export function buildAssetResolvers(assets: MmbakAssetRow[]) {
  const byPk = new Map<number, string>();
  const byUid = new Map<string, string>();
  for (const a of assets) {
    const label = assetDisplayName(a);
    byPk.set(a.z_pk, label);
    const uid = (a.zuid ?? '').trim();
    if (uid) byUid.set(uid, label);
  }
  return {
    byPk,
    byUid,
    resolve(key: string | null | undefined): string {
      if (key == null) return '';
      const t = String(key).trim();
      if (!t) return '';
      if (/^\d+$/.test(t)) {
        const pk = parseInt(t, 10);
        if (byPk.has(pk)) return byPk.get(pk)!;
      }
      if (byUid.has(t)) return byUid.get(t)!;
      return t;
    },
  };
}

function normalizeZdoType(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'bigint') {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export type MmbakTxRow = {
  z_pk: number;
  zdo_type: number | string | bigint | null;
  zamount: number | null;
  zdate: number | null;
  ztxdatestr: string | null;
  zasset_name: string | null;
  zasset_nic: string | null;
  zassetuid: string | null;
  ztoassetuid: string | null;
  zcategory_name: string | null;
  zmemo: string | null;
  zcontent: string | null;
  zcurrency: string | null;
  zisdel?: number | string | bigint | null;
  zuid?: string | null;
  zcategoryuid?: string | null;
  zamountaccount?: number | null;
  zamountsub?: number | null;
  zfee_id?: number | string | bigint | null;
  ztxuidfee?: string | null;
  zcarddividid?: string | null;
  zcarddividemonth?: string | null;
  zcarddividemonthstr?: string | null;
  zcarddivideuid?: string | null;
  zcardtimestampstr?: string | null;
};

function mmRowIsDeleted(t: MmbakTxRow): boolean {
  const v = t.zisdel;
  if (v == null) return false;
  if (typeof v === 'bigint') return v !== BigInt(0);
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true';
}

function feePk(t: MmbakTxRow): number | null {
  const v = t.zfee_id;
  if (v == null) return null;
  const n =
    typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null;
}

/** Extra fields for Finatra import (catalog, soft-delete, fees, card metadata). */
export function mmbakTxToImportExtras(t: MmbakTxRow): Partial<RawExcelRow> {
  const mm: Record<string, unknown> = { z_pk: t.z_pk };
  const zu = (t.zuid ?? '').trim();
  if (zu) mm.z_uid = zu;
  const fp = feePk(t);
  if (fp != null) mm.fee_z_pk = fp;
  const ft = (t.ztxuidfee ?? '').trim();
  if (ft) mm.fee_tx_uid = ft;
  const zsub = t.zamountsub;
  if (typeof zsub === 'number' && Number.isFinite(zsub)) mm.amount_sub = zsub;

  const card: Record<string, string> = {};
  const add = (k: string, v: string | null | undefined) => {
    const s = (v ?? '').trim();
    if (s) card[k] = s;
  };
  add('divid_id', t.zcarddividid);
  add('divide_month', t.zcarddividemonth);
  add('divide_month_str', t.zcarddividemonthstr);
  add('divide_uid', t.zcarddivideuid);
  add('card_timestamp_str', t.zcardtimestampstr);
  if (Object.keys(card).length) mm.card = card;

  const zaa = t.zamountaccount;
  const amountInAccountCurrency =
    typeof zaa === 'number' && Number.isFinite(zaa) ? Math.abs(zaa) : null;

  const zsubAbs =
    typeof zsub === 'number' && Number.isFinite(zsub) ? Math.abs(zsub) : null;

  return {
    mmZUid: zu || undefined,
    mmCategoryUid: (t.zcategoryuid ?? '').trim() || undefined,
    amountInAccountCurrency,
    amountSub: zsubAbs,
    mmSoftDeleted: mmRowIsDeleted(t),
    mmMeta: { mm },
  };
}

function primaryLabelFromTx(r: MmbakTxRow): string {
  const nic = (r.zasset_nic ?? '').trim();
  const name = (r.zasset_name ?? '').trim();
  if (/^\d+$/.test(nic) && name) return name;
  if (nic) return nic;
  if (name) return name;
  return '';
}

/** Same transfer appears as Out (type 3) on one account and In (type 4) on the other — key is undirected. */
function transferDedupKey(
  isoDate: string,
  amount: number,
  uidA: string,
  uidB: string
): string {
  const a = uidA.trim();
  const b = uidB.trim();
  const [x, y] = a <= b ? [a, b] : [b, a];
  return `${isoDate}\t${amount}\t${x}\t${y}`;
}

function mapDoTypeToFlow(
  doType: number,
  amount: number
): { flow: string } | { skip: string } {
  if (doType === 0) {
    if (amount === 0) return { skip: 'income with zero amount' };
    return { flow: 'Income' };
  }
  if (doType === 1) {
    if (amount === 0) return { skip: 'expense with zero amount' };
    return { flow: 'Exp.' };
  }
  if (doType === 3) {
    if (amount === 0) return { skip: 'transfer with zero amount' };
    return { flow: 'Transfer-Out' };
  }
  if (doType === 4) {
    if (amount === 0) return { skip: 'transfer with zero amount' };
    return { flow: 'Transfer-In' };
  }
  if (doType === 7 || doType === 8) {
    if (amount === 0) return { skip: 'balance row with zero amount' };
    if (amount > 0) return { flow: 'Income' };
    return { flow: 'Exp.' };
  }
  return { skip: `unsupported ZDO_TYPE ${doType}` };
}

export type MmbakAssetKeyResolver = (
  key: string | null | undefined
) => string;

export function mmbakTransactionsToRawRows(
  txs: MmbakTxRow[],
  resolveAssetKey: MmbakAssetKeyResolver
): { rows: RawExcelRow[]; parseWarnings: string[] } {
  const rows: RawExcelRow[] = [];
  const parseWarnings: string[] = [];
  /** Pairs (date, amount, two account UIDs) already represented by a Transfer-Out or imported Transfer-In. */
  const transferPairSeen = new Set<string>();
  let transferInMirrorSkips = 0;

  for (const t of txs) {
    const pk = t.z_pk;
    const doType = normalizeZdoType(t.zdo_type);
    if (doType === null) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: ZDO_TYPE missing or not numeric (raw: ${formatCellForLog(t.zdo_type)}). Row skipped.`
      );
      continue;
    }

    const amtRaw = t.zamount;
    const amtNum =
      typeof amtRaw === 'number' && Number.isFinite(amtRaw) ? amtRaw : NaN;
    if (!Number.isFinite(amtNum)) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: ZAMOUNT is not a valid number. Raw: ${formatCellForLog(amtRaw)}. Row skipped.`
      );
      continue;
    }
    const amount = Math.abs(amtNum);

    const mapped = mapDoTypeToFlow(doType, amtNum);
    if ('skip' in mapped) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: skipped (${mapped.skip}). ZDO_TYPE=${doType}, ZAMOUNT=${formatCellForLog(amtRaw)}.`
      );
      continue;
    }

    // Type 4 handled in a second pass so we can import orphan Transfer-Ins and dedupe mirrors.
    if (doType === 4) continue;

    const flowType = mapped.flow;

    let isoDate =
      parseTxDateStr(t.ztxdatestr) ??
      (t.zdate != null ? coreDataDateToIso(t.zdate) : null);
    if (!isoDate) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: could not parse date. ZTXDATESTR=${formatCellForLog(t.ztxdatestr)}, ZDATE=${formatCellForLog(t.zdate)}. Row skipped.`
      );
      continue;
    }

    const fallbackLabel = primaryLabelFromTx(t);
    const fromUid = (t.zassetuid ?? '').trim();
    const accountNameResolved =
      (fromUid && resolveAssetKey(fromUid).trim()) || fallbackLabel;
    if (!accountNameResolved.trim()) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: could not resolve account (ZASSETUID=${formatCellForLog(t.zassetuid)}, no MM labels). Row skipped.`
      );
      continue;
    }

    const categoryName = (t.zcategory_name ?? '').trim();
    const counterparty = doType === 3 ? resolveAssetKey(t.ztoassetuid) : '';

    const note = [t.zmemo, t.zcontent]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(' · ');

    if (doType === 3) {
      transferPairSeen.add(
        transferDedupKey(
          isoDate,
          amount,
          fromUid,
          (t.ztoassetuid ?? '').trim()
        )
      );
    }

    rows.push({
      rowIndex: pk,
      period: 0,
      isoDate,
      accountName: accountNameResolved,
      categoryCol: doType === 3 ? counterparty : categoryName,
      subcategory: '',
      note,
      flowType,
      description: (t.zcontent ?? '').trim(),
      amount,
      currency: (t.zcurrency ?? '').trim() || '—',
      ...mmbakTxToImportExtras(t),
    });
  }

  // Transfer-In (4): MM mirrors each transfer on the destination account. Skip when the Out leg
  // already imported; otherwise import as Transfer-Out with from/to swapped so nothing is lost.
  for (const t of txs) {
    const pk = t.z_pk;
    const doType = normalizeZdoType(t.zdo_type);
    if (doType !== 4) continue;

    const amtRaw = t.zamount;
    const amtNum =
      typeof amtRaw === 'number' && Number.isFinite(amtRaw) ? amtRaw : NaN;
    if (!Number.isFinite(amtNum)) {
      continue;
    }
    const amount = Math.abs(amtNum);
    const mapped = mapDoTypeToFlow(doType, amtNum);
    if ('skip' in mapped) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: skipped (${mapped.skip}). ZDO_TYPE=${doType}, ZAMOUNT=${formatCellForLog(amtRaw)}.`
      );
      continue;
    }

    let isoDate =
      parseTxDateStr(t.ztxdatestr) ??
      (t.zdate != null ? coreDataDateToIso(t.zdate) : null);
    if (!isoDate) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: could not parse date (Transfer-In). ZTXDATESTR=${formatCellForLog(t.ztxdatestr)}, ZDATE=${formatCellForLog(t.zdate)}. Row skipped.`
      );
      continue;
    }

    const recvUid = (t.zassetuid ?? '').trim();
    const sendUid = (t.ztoassetuid ?? '').trim();
    const key = transferDedupKey(isoDate, amount, recvUid, sendUid);
    if (transferPairSeen.has(key)) {
      transferInMirrorSkips += 1;
      continue;
    }

    const destResolved =
      (recvUid && resolveAssetKey(recvUid).trim()) || primaryLabelFromTx(t);
    const sourceResolved =
      (sendUid && resolveAssetKey(sendUid).trim()) || '';
    if (!sourceResolved.trim()) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: Transfer-In could not resolve source account (ZTOASSETUID=${formatCellForLog(t.ztoassetuid)}). Row skipped.`
      );
      continue;
    }
    if (!destResolved.trim()) {
      parseWarnings.push(
        `MMBAK Z_PK ${pk}: Transfer-In could not resolve destination account (ZASSETUID=${formatCellForLog(t.zassetuid)}). Row skipped.`
      );
      continue;
    }

    transferPairSeen.add(key);

    const note = [t.zmemo, t.zcontent]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(' · ');

    rows.push({
      rowIndex: pk,
      period: 0,
      isoDate,
      accountName: sourceResolved,
      categoryCol: destResolved,
      subcategory: '',
      note,
      flowType: 'Transfer-Out',
      description: (t.zcontent ?? '').trim(),
      amount,
      currency: (t.zcurrency ?? '').trim() || '—',
      ...mmbakTxToImportExtras(t),
    });
  }

  const preamble: string[] = [];
  if (transferInMirrorSkips > 0) {
    preamble.push(
      `MMBAK: Ignored ${transferInMirrorSkips.toLocaleString()} Transfer-In row(s) (ZDO_TYPE=4) that duplicate a Transfer-Out on the same date, amount, and account pair. Each transfer is still imported once from the outgoing leg, so balances stay correct.`
    );
  }

  return { rows, parseWarnings: [...preamble, ...parseWarnings] };
}
