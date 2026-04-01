import {
  assetDisplayName,
  type MmbakAssetKeyResolver,
  type MmbakAssetRow,
} from '@/lib/import/mmbak-import';
import {
  detectMmbakGroupKindConvention,
  inferFinatraGroupTypeFromMmGroupName,
  mapMmAssetGroupKindWithConvention,
  mapMmAssetGroupZStatus,
  normalizeCurrencyCode,
  resolveIncludeInTotalFromRow,
  resolveHiddenFromRow,
  type MmbakDetectedColumns,
} from '@/lib/import/mmbak-sqlite-meta';

export type MmbakGroupSource = {
  z_pk: number;
  zuid: string | null;
  zassetgroupname: string | null;
  zisdel: number | null;
  /** Present when backup has a group-type column (see `mm_group_kind` in SQL). */
  mm_group_kind?: unknown;
  /** Android-style ZASSETGROUP.ZSTATUS when ZTYPE is absent. */
  mm_group_status?: unknown;
};

export type MmbakAssetSource = MmbakAssetRow & {
  zgroupuid: string | null;
  zisdel?: number | null;
  mm_currency_raw?: unknown;
  mm_include_raw?: unknown;
  mm_include_neg_raw?: unknown;
  mm_hidden_raw?: unknown;
};

export type FinatraGroupType = 'default' | 'credit' | 'debit';

export type MmbakAccountSpec = {
  name: string;
  groupName: string;
  /** MM ZASSETGROUP ZUID — used server-side to pick group_type when creating groups */
  mmGroupUid?: string;
  /** Finatra `account_groups.group_type` for this account’s MM group */
  groupType: FinatraGroupType;
  currency?: string | null;
  in_total: boolean;
  hidden: boolean;
};

export const MMBAK_TO_FINATRA_MAP = {
  source: 'Money Manager (SQLite .mmbak)',
  account_groups: {
    mmTable: 'ZASSETGROUP',
    mmColumns: { id: 'Z_PK', uid: 'ZUID', name: 'ZASSETGROUPNAME' },
    finatraTable: 'public.account_groups',
    finatraColumns: { name: 'group_name', portfolio: 'port_id' },
  },
  accounts: {
    mmTable: 'ZASSET',
    mmColumns: {
      uid: 'ZUID',
      display: 'ZNICNAME / ZCARD_ACCOUNT_NAME',
      groupLink:
        'ZGROUPUID (or ZASSETGROUPUID / ZGROUP) → ZASSETGROUP.ZUID or Z_PK',
    },
    finatraTable: 'public.accounts',
    finatraColumns: {
      name: 'name',
      group: 'group_id → account_groups',
      balance: 'amount (not set from this backup)',
    },
  },
  transactions: {
    mmTable: 'ZINOUTCOME',
    mmColumns: {
      type: 'ZDO_TYPE (0 inc, 1 exp, 3/4 transfer legs, 7/8 balance)',
      amount: 'ZAMOUNT',
      date: 'ZTXDATESTR or ZDATE (Core Data)',
      account: 'ZASSETUID',
      counterparty: 'ZTOASSETUID',
      category: 'ZCATEGORY_NAME',
    },
    finatraTable: 'public.transactions',
    finatraColumns: {
      type: 'transaction_type',
      amount: 'amount',
      date: 'transaction_date',
      account: 'account_id',
      toAccount: 'to_account_id',
      category: 'category',
      note: 'note / description',
    },
  },
} as const;

export type ImportStructurePreview = {
  groups: {
    mmUid: string;
    mmName: string;
    finatraGroupName: string;
    groupType: FinatraGroupType;
    mmGroupKindRaw: unknown;
    mmGroupStatusRaw: unknown;
  }[];
  accounts: {
    finatraAccountName: string;
    mmAssetUid: string;
    mmGroupUid: string;
    finatraGroupName: string;
    currency: string | null;
    inTotal: boolean;
    hidden: boolean;
  }[];
};

function finatraGroupLabels(groups: MmbakGroupSource[]): Map<string, string> {
  const tally = new Map<string, number>();
  for (const g of groups) {
    const base = (g.zassetgroupname ?? '').trim() || 'Unnamed group';
    tally.set(base, (tally.get(base) ?? 0) + 1);
  }
  const mmUidToLabel = new Map<string, string>();
  for (const g of groups) {
    const uid = (g.zuid ?? '').trim();
    if (!uid) continue;
    const base = (g.zassetgroupname ?? '').trim() || 'Unnamed group';
    const label =
      (tally.get(base) ?? 0) > 1 ? `${base} (${uid.slice(0, 8)})` : base;
    mmUidToLabel.set(uid, label);
  }
  return mmUidToLabel;
}

function resolveFinatraGroupTypeForMmGroup(
  mmGroupKind: unknown,
  mmGroupStatus: unknown,
  mmGroupDisplayName: string,
  numericConv: 'A' | 'B'
): FinatraGroupType {
  // Prefer localized group title over ZSTATUS so template codes (e.g. status 2) do not
  // override user-visible names like “Loan” (IOU bucket → default, not credit cards).
  const fromName = inferFinatraGroupTypeFromMmGroupName(mmGroupDisplayName);
  if (fromName !== null) return fromName;
  const fromStatus = mapMmAssetGroupZStatus(mmGroupStatus);
  if (fromStatus !== 'default') return fromStatus;
  return mapMmAssetGroupKindWithConvention(mmGroupKind, numericConv);
}

type GroupLinkResolve = {
  finatraGroupName: string;
  groupType: FinatraGroupType;
  /** Canonical ZUID when present (for specs); may be empty if backup has no UID. */
  canonicalGroupUid: string;
};

function buildGroupLinkIndex(
  groupRows: MmbakGroupSource[],
  mmUidToLabel: Map<string, string>,
  numericConv: 'A' | 'B'
): {
  byUid: Map<string, GroupLinkResolve>;
  byPk: Map<number, GroupLinkResolve>;
} {
  const byUid = new Map<string, GroupLinkResolve>();
  const byPk = new Map<number, GroupLinkResolve>();

  for (const g of groupRows) {
    const uid = (g.zuid ?? '').trim();
    const mmName = (g.zassetgroupname ?? '').trim() || 'Unnamed group';
    const finatraGroupName = uid
      ? (mmUidToLabel.get(uid) ?? mmName)
      : mmName;
    const groupType = resolveFinatraGroupTypeForMmGroup(
      g.mm_group_kind,
      g.mm_group_status,
      mmName,
      numericConv
    );
    const canonicalGroupUid = uid || `z_pk:${g.z_pk}`;
    const info: GroupLinkResolve = {
      finatraGroupName,
      groupType,
      canonicalGroupUid,
    };
    byPk.set(g.z_pk, info);
    if (uid) byUid.set(uid, info);
  }

  return { byUid, byPk };
}

function resolveGroupLink(
  rawLink: string | null | undefined,
  index: { byUid: Map<string, GroupLinkResolve>; byPk: Map<number, GroupLinkResolve> }
): GroupLinkResolve {
  const t = (rawLink ?? '').trim();
  if (!t) {
    return {
      finatraGroupName: 'Money Manager',
      groupType: 'default',
      canonicalGroupUid: '',
    };
  }
  const byUidHit = index.byUid.get(t);
  if (byUidHit) return byUidHit;
  if (/^\d+$/.test(t)) {
    const pk = parseInt(t, 10);
    if (Number.isFinite(pk) && index.byPk.has(pk)) {
      return index.byPk.get(pk)!;
    }
  }
  return {
    finatraGroupName: 'Money Manager',
    groupType: 'default',
    canonicalGroupUid: t,
  };
}

export function makeMmbakAssetResolver(
  uidToFinatra: Map<string, string>,
  pkToFinatra: Map<number, string>
): MmbakAssetKeyResolver {
  return (key) => {
    if (key == null) return '';
    const t = String(key).trim();
    if (!t) return '';
    if (uidToFinatra.has(t)) return uidToFinatra.get(t)!;
    if (/^\d+$/.test(t)) {
      const pk = parseInt(t, 10);
      if (pkToFinatra.has(pk)) return pkToFinatra.get(pk)!;
    }
    return t;
  };
}

export function buildMmbakStructureAndSpecs(
  groupRows: MmbakGroupSource[],
  assetRows: MmbakAssetSource[],
  detected: MmbakDetectedColumns
): {
  structure: ImportStructurePreview;
  accountSpecs: MmbakAccountSpec[];
  resolveAssetKey: MmbakAssetKeyResolver;
} {
  const mmUidToLabel = finatraGroupLabels(groupRows);
  const numericConv = detectMmbakGroupKindConvention(groupRows);
  const groupLinkIndex = buildGroupLinkIndex(
    groupRows,
    mmUidToLabel,
    numericConv
  );

  const structureGroups = groupRows
    .filter((g) => !(g.zisdel ?? 0) && (g.zuid ?? '').trim())
    .map((g) => {
      const uid = (g.zuid ?? '').trim();
      const mmName = (g.zassetgroupname ?? '').trim() || 'Unnamed group';
      return {
        mmUid: uid,
        mmName,
        finatraGroupName: mmUidToLabel.get(uid) ?? mmName,
        groupType: resolveFinatraGroupTypeForMmGroup(
          g.mm_group_kind,
          g.mm_group_status,
          mmName,
          numericConv
        ),
        mmGroupKindRaw: g.mm_group_kind ?? null,
        mmGroupStatusRaw: g.mm_group_status ?? null,
      };
    });

  const usedAccountNames = new Set<string>();
  function uniqueName(base: string, assetUid: string): string {
    let n = base.trim() || 'Unnamed account';
    if (!usedAccountNames.has(n)) {
      usedAccountNames.add(n);
      return n;
    }
    const suffix = assetUid.trim().slice(0, 8) || 'acct';
    let candidate = `${n} (${suffix})`;
    let i = 0;
    while (usedAccountNames.has(candidate)) {
      i += 1;
      candidate = `${n} (${suffix}-${i})`;
    }
    usedAccountNames.add(candidate);
    return candidate;
  }

  const accountSpecs: MmbakAccountSpec[] = [];
  const structureAccounts: ImportStructurePreview['accounts'] = [];
  const uidToFinatra = new Map<string, string>();
  const pkToFinatra = new Map<number, string>();

  for (const a of assetRows) {
    const uid = (a.zuid ?? '').trim();
    if (!uid) continue;
    const baseName = assetDisplayName(a);
    const finatraName = uniqueName(baseName, uid);
    const gUid = (a.zgroupuid ?? '').trim();
    const resolvedGroup = resolveGroupLink(gUid, groupLinkIndex);

    const rowRec = a as unknown as Record<string, unknown>;
    const inTotal =
      resolveIncludeInTotalFromRow(rowRec, detected) ?? true;
    const hidden = resolveHiddenFromRow(rowRec, detected) ?? false;
    const currency = normalizeCurrencyCode(a.mm_currency_raw);
    const { finatraGroupName, groupType, canonicalGroupUid } = resolvedGroup;

    uidToFinatra.set(uid, finatraName);
    pkToFinatra.set(a.z_pk, finatraName);

    accountSpecs.push({
      name: finatraName,
      groupName: finatraGroupName,
      mmGroupUid: canonicalGroupUid || gUid || undefined,
      groupType,
      currency: currency ?? undefined,
      in_total: inTotal,
      hidden,
    });
    structureAccounts.push({
      finatraAccountName: finatraName,
      mmAssetUid: uid,
      mmGroupUid: gUid || '—',
      finatraGroupName,
      currency,
      inTotal,
      hidden,
    });
  }

  return {
    structure: { groups: structureGroups, accounts: structureAccounts },
    accountSpecs,
    resolveAssetKey: makeMmbakAssetResolver(uidToFinatra, pkToFinatra),
  };
}
