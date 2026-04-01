import type Database from 'better-sqlite3';

/** SQLite PRAGMA table_info names for a table. */
export function getSqliteTableColumns(
  db: Database.Database,
  table: string
): Set<string> {
  const safe = table.replace(/"/g, '""');
  const rows = db.prepare(`PRAGMA table_info("${safe}")`).all() as {
    name: string;
  }[];
  return new Set(rows.map((r) => r.name));
}

/** First matching column that exists on the table (case-insensitive). */
export function pickSqliteColumn(
  cols: Set<string>,
  candidates: string[]
): string | null {
  const byUpper = new Map<string, string>();
  for (const c of Array.from(cols)) {
    byUpper.set(c.toUpperCase(), c);
  }
  for (const cand of candidates) {
    const hit = byUpper.get(cand.toUpperCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * Parses ZASSETGROUP type/kind integer from Core Data (handles float/blob quirks).
 */
export function normalizeMmGroupKindNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n =
    typeof raw === 'bigint'
      ? Number(raw)
      : typeof raw === 'number'
        ? raw
        : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * Convention **A** (legacy heuristic): ZTYPE **1** = credit, **2** = debit/bank.
 * Convention **B** (common Realbyte / iOS): **1** = bank/debit, **2** = credit card.
 * `detectMmbakGroupKindConvention` picks A vs B from group titles; **name wins first** in the importer.
 */
export function mapMmAssetGroupKindWithConvention(
  raw: unknown,
  conv: 'A' | 'B'
): 'default' | 'credit' | 'debit' {
  const n = normalizeMmGroupKindNumber(raw);
  if (n === null || n === 0) return 'default';
  if (conv === 'A') {
    if (n === 1) return 'credit';
    if (n === 2) return 'debit';
  } else {
    if (n === 1) return 'debit';
    if (n === 2) return 'credit';
  }
  return 'default';
}

/** Defaults to convention B when not using per-file detection. */
export function mapMmAssetGroupKind(
  raw: unknown
): 'default' | 'credit' | 'debit' {
  return mapMmAssetGroupKindWithConvention(raw, 'B');
}

/**
 * Android / some MM backups expose **ZASSETGROUP.ZSTATUS** while **ZTYPE** is absent.
 * Observed in field data: 2 = credit-card / liabilities-style group, 3 = debit card, 4 = savings.
 */
export function mapMmAssetGroupZStatus(
  raw: unknown
): 'default' | 'credit' | 'debit' {
  const n = normalizeMmGroupKindNumber(raw);
  if (n === null) return 'default';
  if (n === 2) return 'credit';
  if (n === 3 || n === 4) return 'debit';
  return 'default';
}

/** Strong name-based signal for Finatra `group_type` (null = use status / numeric kind). */
export type MmGroupNameGroupTypeHint = 'default' | 'credit' | 'debit' | null;

/**
 * When ZASSETGROUP has no type column or values are ambiguous, infer Finatra `group_type`
 * from the localized group title (still works for English + common labels).
 *
 * Returns **`default`** for standalone “loan” style buckets so `ZSTATUS=2` (card/liability in MM)
 * does not force credit-card UI — those groups are often IOUs, not revolving cards.
 */
export function inferFinatraGroupTypeFromMmGroupName(
  name: string
): MmGroupNameGroupTypeHint {
  const t = name.trim();
  if (!t) return null;
  const n = t.toLowerCase();
  if (/\bloan\b/i.test(t)) return 'default';
  // "Debit card" accounts are usually cash/bank-style, not credit-card groups.
  if (/\bdebit\s+card\b/i.test(t)) return 'debit';
  if (
    /\b(credit\s*card|credit\s*cards|liabilit|liability|payable|overdraft|card\s+account)\b/i.test(
      t
    ) ||
    /\bcc\b/.test(n) ||
    /\b(visa|mastercard|amex|クレジット|カード|신용|채무)\b/i.test(t) ||
    /信用卡|負債/.test(t)
  ) {
    return 'credit';
  }
  if (
    /\b(cash|checking|current\s+account|savings|debit|bank|deposit|wallet|investment|asset|mortgage)\b/i.test(
      t
    )
  ) {
    return 'debit';
  }
  return null;
}

/**
 * Vote between conventions A and B using groups whose **names** clearly say credit vs debit.
 * Falls back to **B** when there is no signal (matches most current Realbyte backups).
 */
export function detectMmbakGroupKindConvention(
  groupRows: { mm_group_kind?: unknown; zassetgroupname?: string | null }[]
): 'A' | 'B' {
  let scoreA = 0;
  let scoreB = 0;
  for (const g of groupRows) {
    const n = normalizeMmGroupKindNumber(g.mm_group_kind);
    if (n !== 1 && n !== 2) continue;
    const nm = inferFinatraGroupTypeFromMmGroupName(
      (g.zassetgroupname ?? '').trim() || ''
    );
    if (nm === 'credit') {
      if (n === 1) scoreA += 2;
      if (n === 2) scoreB += 2;
    } else if (nm === 'debit') {
      if (n === 2) scoreA += 2;
      if (n === 1) scoreB += 2;
    }
    // nm === 'default' or null: no convention vote from this group
  }
  if (scoreA === 0 && scoreB === 0) return 'B';
  return scoreA > scoreB ? 'A' : 'B';
}

function boolish(raw: unknown): boolean | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw !== 0;
  if (typeof raw === 'bigint') return raw !== BigInt(0);
  const s = String(raw).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return undefined;
}

const COL_GROUP_KIND = [
  'ZTYPE',
  'ZASSETGROUPTYPE',
  'ZGROUPTYPE',
  'ZGROUPKIND',
  'ZACCOUNTGROUPTYPE',
  'ZASSETTYPE',
  'ZGROUPCLASS',
];

const COL_ASSET_CURRENCY = [
  'ZCURRENCY',
  'ZCURRENCYCODE',
  'ZBASECURRENCYCODE',
  'ZBASECURRENCY',
];

/**
 * Columns that mean “include this account in app totals / summary” (MM wording varies by platform).
 *
 * **Realbyte Android `.mmbak` (Core Data):** `ZASSET` has no `ZINCLUDEINSUMMARY`-style field. The edit
 * screen toggle **Include in totals** is persisted as **`ZISREFLECT`**: `0` = included, any non-zero
 * (usually `1`) = excluded. Same column name appears on backups that also have explicit INCLUDE*
 * columns; we prefer those first when present.
 */
const COL_INCLUDE_TOTAL_POS = [
  'ZINCLUDEINSUMMARY',
  'ZINCLUDEINTOTAL',
  'ZSHOWINSUMMARY',
  'ZSHOWINTOTAL',
  'ZINSUMMARY',
  'ZINCLUDEINGRAPH',
  'ZINCLUDEINBALANCE',
  'ZINCLUDEBALANCE',
  'ZINCLUDE',
  'ZFORGRAPH',
  'ZFORBALANCE',
  'ZISREFLECT',
];

/** When 1 / true, account is excluded from totals. */
const COL_INCLUDE_TOTAL_NEG = [
  'ZEXCLUDEFROMSUMMARY',
  'ZNOTINSUMMARY',
  'ZHIDEFROMSUMMARY',
  'ZEXCLUDEFROMTOTAL',
  'ZEXCLUDEFROMGRAPH',
  'ZEXCLUDEINSUMMARY',
  'ZEXCLUDEINTOTAL',
  'ZHIDEFROMTOTAL',
  'ZHIDEFROMGRAPH',
];

const COL_HIDDEN = ['ZISHIDDEN', 'ZHIDDEN', 'ZISARCHIVED', 'ZARCHIVED'];

/** ZASSET → account group link (Core Data entity relationship column names vary). */
const COL_ASSET_GROUP_FK = [
  'ZGROUPUID',
  'ZASSETGROUPUID',
  'ZGROUP',
  'ZGROUPID',
  'ZASSETGROUP',
];

export type MmbakDetectedColumns = {
  assetGroupKind: string | null;
  /** ZASSETGROUP.ZSTATUS (Android-style group class) when present. */
  assetGroupStatus: string | null;
  /** Physical column on ZASSET that points at ZASSETGROUP (UID string or Z_PK). */
  assetGroupFk: string | null;
  assetCurrency: string | null;
  assetIncludeTotal: string | null;
  assetIncludeTotalInverted: string | null;
  assetHidden: string | null;
};

const ZASSETGROUP_KIND_BLOCKLIST = new Set(
  [
    'Z_PK',
    'ZUID',
    'ZASSETGROUPNAME',
    'ZISDEL',
    'Z_ENT',
    'Z_OPT',
    'ZDEVICEID',
    'ZPARENTGROUPUID',
    'ZPARENTUID',
  ].map((s) => s.toUpperCase())
);

/** When known `COL_GROUP_KIND` names are absent, pick a plausible type/kind column on ZASSETGROUP. */
export function discoverZAssetGroupKindColumn(cols: Set<string>): string | null {
  const candidates = Array.from(cols).filter(
    (c) => !ZASSETGROUP_KIND_BLOCKLIST.has(c.toUpperCase())
  );
  const ranked = candidates.filter((c) => {
    const u = c.toUpperCase();
    return (
      /^ZTYPE$/i.test(c) ||
      /ASSETGROUPTYPE|GROUPTYPE|GROUPKIND|GROUPCLASS|ACCOUNTGROUPTYPE/i.test(u)
    );
  });
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => a.length - b.length);
  return ranked[0];
}

/**
 * When explicit include/exclude columns are not in our allow-lists, discover ZASSET columns whose
 * names suggest include-in-summary / exclude-from-total semantics.
 */
function discoverZAssetIncludeColumn(
  cols: Set<string>
): { physical: string; inverted: boolean } | null {
  const list = Array.from(cols);
  const neg = list.filter((c) => {
    const u = c.toUpperCase();
    if (!/^Z/i.test(u) || u.length < 6) return false;
    const excl =
      u.includes('EXCLUDE') || u.includes('NOTIN') || u.includes('HIDEFROM');
    const scope =
      u.includes('SUMMARY') ||
      u.includes('TOTAL') ||
      u.includes('GRAPH') ||
      u.includes('BALANCE');
    return excl && scope;
  });
  if (neg.length > 0) {
    neg.sort((a, b) => a.length - b.length);
    return { physical: neg[0], inverted: true };
  }
  const pos = list.filter((c) => {
    const u = c.toUpperCase();
    if (!/^Z/i.test(u) || u.length < 6) return false;
    if (
      u.includes('EXCLUDE') ||
      u.includes('NOTIN') ||
      u.includes('HIDEFROM')
    ) {
      return false;
    }
    return (
      u.includes('INCLUDEINSUMMARY') ||
      u.includes('INCLUDEINTOTAL') ||
      u.includes('SHOWINSUMMARY') ||
      u.includes('SHOWINTOTAL') ||
      u.includes('INCLUDEINGRAPH') ||
      u.includes('INCLUDEINBALANCE') ||
      /^ZINSUMMARY$/i.test(c) ||
      (u.includes('INCLUDE') &&
        (u.includes('SUMMARY') ||
          u.includes('TOTAL') ||
          u.includes('GRAPH') ||
          u.includes('BALANCE')))
    );
  });
  if (pos.length > 0) {
    pos.sort((a, b) => a.length - b.length);
    return { physical: pos[0], inverted: false };
  }
  return null;
}

export function detectMmbakColumnMapping(
  db: Database.Database
): MmbakDetectedColumns {
  const gCols = getSqliteTableColumns(db, 'ZASSETGROUP');
  const aCols = getSqliteTableColumns(db, 'ZASSET');
  let assetGroupKind = pickSqliteColumn(gCols, COL_GROUP_KIND);
  if (!assetGroupKind) {
    assetGroupKind = discoverZAssetGroupKindColumn(gCols);
  }
  let assetIncludeTotalInverted = pickSqliteColumn(
    aCols,
    COL_INCLUDE_TOTAL_NEG
  );
  let assetIncludeTotal = pickSqliteColumn(aCols, COL_INCLUDE_TOTAL_POS);
  if (
    assetIncludeTotalInverted &&
    assetIncludeTotal &&
    assetIncludeTotalInverted === assetIncludeTotal
  ) {
    assetIncludeTotal = null;
  }
  if (!assetIncludeTotalInverted && !assetIncludeTotal) {
    const disc = discoverZAssetIncludeColumn(aCols);
    if (disc) {
      if (disc.inverted) assetIncludeTotalInverted = disc.physical;
      else assetIncludeTotal = disc.physical;
    }
  }
  return {
    assetGroupKind,
    assetGroupStatus: pickSqliteColumn(gCols, ['ZSTATUS', 'ZGROUPSTATUS']),
    assetGroupFk: pickSqliteColumn(aCols, COL_ASSET_GROUP_FK),
    assetCurrency: pickSqliteColumn(aCols, COL_ASSET_CURRENCY),
    assetIncludeTotal,
    assetIncludeTotalInverted,
    assetHidden: pickSqliteColumn(aCols, COL_HIDDEN),
  };
}

/** Normalize to a short currency code for Postgres; null = use portfolio default. */
export function normalizeCurrencyCode(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === '—' || s === '-' || s === '–') return null;
  const letters = s.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  if (/^[A-Z]{3}$/i.test(s)) return s.toUpperCase();
  return s.slice(0, 8).toUpperCase();
}

function qid(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function buildZAssetGroupSelectSql(
  detected: MmbakDetectedColumns
): string {
  const parts = [
    'Z_PK AS z_pk',
    'ZUID AS zuid',
    'ZASSETGROUPNAME AS zassetgroupname',
    'ZISDEL AS zisdel',
  ];
  if (detected.assetGroupKind) {
    parts.push(`${qid(detected.assetGroupKind)} AS mm_group_kind`);
  } else {
    parts.push('NULL AS mm_group_kind');
  }
  if (detected.assetGroupStatus) {
    parts.push(`${qid(detected.assetGroupStatus)} AS mm_group_status`);
  } else {
    parts.push('NULL AS mm_group_status');
  }
  return `SELECT ${parts.join(', ')} FROM ZASSETGROUP`;
}

/** Transaction rows — ZCURRENCY may be absent in older backups. Includes deleted rows for soft-import. */
export function buildZInOutcomeSelectSql(db: Database.Database): string {
  const cols = getSqliteTableColumns(db, 'ZINOUTCOME');
  const cur = pickSqliteColumn(cols, ['ZCURRENCY', 'ZCURRENCYCODE']);
  const zisdel = pickSqliteColumn(cols, ['ZISDEL']);
  const zuid = pickSqliteColumn(cols, ['ZUID']);
  const zcatuid = pickSqliteColumn(cols, ['ZCATEGORYUID']);
  const zamtAcct = pickSqliteColumn(cols, ['ZAMOUNTACCOUNT']);
  const zamtSub = pickSqliteColumn(cols, ['ZAMOUNTSUB']);
  const zfeeId = pickSqliteColumn(cols, ['ZFEE_ID', 'ZFEEID']);
  const zfeeTxUid = pickSqliteColumn(cols, ['ZTXUIDFEE']);
  const zcardDivId = pickSqliteColumn(cols, ['ZCARDDIVIDID']);
  const zcardDivMo = pickSqliteColumn(cols, ['ZCARDDIVIDEMONTH']);
  const zcardDivMoStr = pickSqliteColumn(cols, ['ZCARDDIVIDEMONTHSTR']);
  const zcardDivUid = pickSqliteColumn(cols, ['ZCARDDIVIDEUID']);
  const zcardTs = pickSqliteColumn(cols, ['ZCARDTIMESTAMPSTR']);

  const parts = [
    'Z_PK AS z_pk',
    'ZDO_TYPE AS zdo_type',
    'ZAMOUNT AS zamount',
    'ZDATE AS zdate',
    'ZTXDATESTR AS ztxdatestr',
    'ZASSET_NAME AS zasset_name',
    'ZASSET_NIC AS zasset_nic',
    'ZASSETUID AS zassetuid',
    'ZTOASSETUID AS ztoassetuid',
    'ZCATEGORY_NAME AS zcategory_name',
    'ZMEMO AS zmemo',
    'ZCONTENT AS zcontent',
  ];
  if (cur) {
    parts.push(`${qid(cur)} AS zcurrency`);
  } else {
    parts.push('NULL AS zcurrency');
  }
  const opt = (
    col: string | null,
    alias: string
  ): void => {
    if (col) parts.push(`${qid(col)} AS ${alias}`);
    else parts.push(`NULL AS ${alias}`);
  };
  opt(zisdel, 'zisdel');
  opt(zuid, 'zuid');
  opt(zcatuid, 'zcategoryuid');
  opt(zamtAcct, 'zamountaccount');
  opt(zamtSub, 'zamountsub');
  opt(zfeeId, 'zfee_id');
  opt(zfeeTxUid, 'ztxuidfee');
  opt(zcardDivId, 'zcarddividid');
  opt(zcardDivMo, 'zcarddividemonth');
  opt(zcardDivMoStr, 'zcarddividemonthstr');
  opt(zcardDivUid, 'zcarddivideuid');
  opt(zcardTs, 'zcardtimestampstr');

  return `SELECT ${parts.join(', ')} FROM ZINOUTCOME ORDER BY COALESCE(ZTXDATESTR, ''), Z_PK`;
}

export function buildZAssetSelectSql(detected: MmbakDetectedColumns): string {
  const groupFk = detected.assetGroupFk ?? 'ZGROUPUID';
  const parts = [
    'Z_PK AS z_pk',
    'ZUID AS zuid',
    'ZNICNAME AS znicname',
    'ZCARD_ACCOUNT_NAME AS zcard_account_name',
    `${qid(groupFk)} AS zgroupuid`,
    'ZISDEL AS zisdel',
  ];
  if (detected.assetCurrency) {
    parts.push(`${qid(detected.assetCurrency)} AS mm_currency_raw`);
  } else {
    parts.push('NULL AS mm_currency_raw');
  }
  if (detected.assetIncludeTotalInverted) {
    parts.push(
      `${qid(detected.assetIncludeTotalInverted)} AS mm_include_neg_raw`
    );
  } else {
    parts.push('NULL AS mm_include_neg_raw');
  }
  if (detected.assetIncludeTotal) {
    parts.push(`${qid(detected.assetIncludeTotal)} AS mm_include_raw`);
  } else {
    parts.push('NULL AS mm_include_raw');
  }
  if (detected.assetHidden) {
    parts.push(`${qid(detected.assetHidden)} AS mm_hidden_raw`);
  } else {
    parts.push('NULL AS mm_hidden_raw');
  }
  return `SELECT ${parts.join(', ')} FROM ZASSET`;
}

/** Money Manager Android `ZASSET.ZISREFLECT`: 0 = include in totals, non-zero = exclude. */
function isZIsReflectIncludeColumn(physicalName: string | null): boolean {
  if (!physicalName) return false;
  return /^ZISREFLECT$/i.test(physicalName);
}

export function resolveIncludeInTotalFromRow(
  row: Record<string, unknown>,
  detected: MmbakDetectedColumns
): boolean | undefined {
  let excluded: boolean | undefined;
  let included: boolean | undefined;
  let reflectInclude: boolean | undefined;
  if (detected.assetIncludeTotalInverted) {
    const v = boolish(row.mm_include_neg_raw);
    if (v !== undefined) excluded = v;
  }
  if (detected.assetIncludeTotal) {
    if (isZIsReflectIncludeColumn(detected.assetIncludeTotal)) {
      const n = normalizeMmGroupKindNumber(row.mm_include_raw);
      if (n !== null) reflectInclude = n === 0;
    } else {
      const v = boolish(row.mm_include_raw);
      if (v !== undefined) included = v;
    }
  }
  if (excluded === true) return false;
  if (reflectInclude === false) return false;
  if (reflectInclude === true) return true;
  if (included === false) return false;
  if (included === true) return true;
  if (excluded === false) return true;
  return undefined;
}

export function resolveHiddenFromRow(
  row: Record<string, unknown>,
  detected: MmbakDetectedColumns
): boolean | undefined {
  if (!detected.assetHidden) return undefined;
  return boolish(row.mm_hidden_raw);
}
