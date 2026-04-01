import type Database from 'better-sqlite3';

function hasTable(db: Database.Database, name: string): boolean {
  const r = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
    )
    .get(name);
  return Boolean(r);
}

export type MmbakCategoryExport = {
  z_pk: number;
  zuid: string | null;
  zname: string | null;
  zpuid: string | null;
  zdo_type: number | null;
  zorder: number | null;
};

export type MmbakTagExport = {
  z_pk: number;
  zuid: string | null;
  zname: string | null;
};

/** `ZTXTAG`: transaction UID → tag UID (see `ZTAG.ZUID`). */
export type MmbakTxTagLink = {
  z_tx_uid: string;
  z_tag_uid: string;
};

export type MmbakBudgetExport = {
  z_pk: number;
  zuid: string | null;
  zdaystr: string | null;
  zperiodtypeint: number | null;
  ztranstypeint: number | null;
  ztotaltypeint: number | null;
  raw: Record<string, unknown>;
};

export type MmbakBudgetAmountExport = {
  z_pk: number;
  raw: Record<string, unknown>;
};

export type MmbakExtensionPayload = {
  categories: MmbakCategoryExport[];
  tags: MmbakTagExport[];
  transactionTagLinks: MmbakTxTagLink[];
  budgets: MmbakBudgetExport[];
  budgetAmounts: MmbakBudgetAmountExport[];
  recurringTemplates: Record<string, unknown>[];
  favoriteTemplates: Record<string, unknown>[];
  portfolioKv: Array<{ source: string; key: string; value: unknown }>;
  standaloneMemos: Record<string, unknown>[];
};

function numish(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'bigint') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/** Read auxiliary MM tables for a richer import (budgets, tags, catalog, etc.). */
export function readMmbakExtension(db: Database.Database): MmbakExtensionPayload {
  const empty: MmbakExtensionPayload = {
    categories: [],
    tags: [],
    transactionTagLinks: [],
    budgets: [],
    budgetAmounts: [],
    recurringTemplates: [],
    favoriteTemplates: [],
    portfolioKv: [],
    standaloneMemos: [],
  };

  if (!hasTable(db, 'ZCATEGORY')) return empty;

  const catRows = db.prepare('SELECT * FROM ZCATEGORY').all() as Record<
    string,
    unknown
  >[];
  for (const r of catRows) {
    const isDel = numish(r.ZISDEL);
    if (isDel === 1) continue;
    empty.categories.push({
      z_pk: numish(r.Z_PK) ?? 0,
      zuid: str(r.ZUID),
      zname: str(r.ZNAME),
      zpuid: str(r.ZPUID),
      zdo_type: numish(r.ZDOTYPE),
      zorder: numish(r.ZORDER),
    });
  }

  if (hasTable(db, 'ZTAG')) {
    const tagRows = db.prepare('SELECT * FROM ZTAG').all() as Record<
      string,
      unknown
    >[];
    for (const r of tagRows) {
      const isDel = numish(r.ZISDEL);
      if (isDel === 1) continue;
      empty.tags.push({
        z_pk: numish(r.Z_PK) ?? 0,
        zuid: str(r.ZUID),
        zname: str(r.ZNAME),
      });
    }
  }

  if (hasTable(db, 'ZTXTAG')) {
    const linkRows = db.prepare('SELECT * FROM ZTXTAG').all() as Record<
      string,
      unknown
    >[];
    for (const r of linkRows) {
      const isDel = numish(r.ZISDEL);
      if (isDel === 1) continue;
      const txUid = str(r.ZTXUID);
      const tagUid = str(r.ZTAGUID);
      if (txUid && tagUid) {
        empty.transactionTagLinks.push({
          z_tx_uid: txUid,
          z_tag_uid: tagUid,
        });
      }
    }
  }

  if (hasTable(db, 'ZBUDGET')) {
    const bRows = db.prepare('SELECT * FROM ZBUDGET').all() as Record<
      string,
      unknown
    >[];
    for (const r of bRows) {
      const isDel = numish(r.ZISDEL);
      if (isDel === 1) continue;
      empty.budgets.push({
        z_pk: numish(r.Z_PK) ?? 0,
        zuid: str(r.ZUID),
        zdaystr: str(r.ZDAYSTR),
        zperiodtypeint: numish(r.ZPERIODTYPEINT),
        ztranstypeint: numish(r.ZTRANSTYPEINT),
        ztotaltypeint: numish(r.ZTOTALTYPEINT),
        raw: { ...r },
      });
    }
  }

  if (hasTable(db, 'ZBUDGETAMOUNT')) {
    const baRows = db.prepare('SELECT * FROM ZBUDGETAMOUNT').all() as Record<
      string,
      unknown
    >[];
    for (const r of baRows) {
      empty.budgetAmounts.push({
        z_pk: numish(r.Z_PK) ?? 0,
        raw: { ...r },
      });
    }
  }

  if (hasTable(db, 'ZREPEATTRANSACTION')) {
    const reps = db
      .prepare('SELECT * FROM ZREPEATTRANSACTION')
      .all() as Record<string, unknown>[];
    empty.recurringTemplates = reps.filter((r) => numish(r.ZISDEL) !== 1);
  }

  if (hasTable(db, 'ZFAVTRANSACTION')) {
    const favs = db
      .prepare('SELECT * FROM ZFAVTRANSACTION')
      .all() as Record<string, unknown>[];
    empty.favoriteTemplates = favs.filter((r) => numish(r.ZISDEL) !== 1);
  }

  if (hasTable(db, 'ZPROPERTY')) {
    const props = db.prepare('SELECT * FROM ZPROPERTY').all() as Record<
      string,
      unknown
    >[];
    let i = 0;
    for (const r of props) {
      if (numish(r.ZISDEL) === 1) continue;
      const k = str(r.ZKEY) ?? `property_${i}`;
      empty.portfolioKv.push({
        source: 'mm_property',
        key: k,
        value: {
          ztype: str(r.ZTYPE),
          zvalue: str(r.ZVALUE),
          zdesc: str(r.ZDESC),
        },
      });
      i += 1;
    }
  }

  if (hasTable(db, 'ZETC')) {
    const etc = db.prepare('SELECT * FROM ZETC').all() as Record<
      string,
      unknown
    >[];
    let i = 0;
    for (const r of etc) {
      if (numish(r.ZISDEL) === 1) continue;
      const k =
        str(r.ZDATAYTYPEKEY) ?? str(r.ZUID) ?? str(r.ZDATA) ?? `etc_${i}`;
      empty.portfolioKv.push({ source: 'mm_etc', key: k, value: r });
      i += 1;
    }
  }

  if (hasTable(db, 'ZMEMO')) {
    empty.standaloneMemos = db
      .prepare('SELECT * FROM ZMEMO')
      .all() as Record<string, unknown>[];
  }

  return empty;
}
