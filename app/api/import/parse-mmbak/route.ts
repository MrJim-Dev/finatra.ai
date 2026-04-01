import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import {
  mmbakTransactionsToRawRows,
  type MmbakTxRow,
} from '@/lib/import/mmbak-import';
import {
  buildMmbakStructureAndSpecs,
  type MmbakAssetSource,
  type MmbakGroupSource,
} from '@/lib/import/mmbak-structure';
import {
  buildZAssetGroupSelectSql,
  buildZAssetSelectSql,
  buildZInOutcomeSelectSql,
  detectMmbakColumnMapping,
  detectMmbakGroupKindConvention,
} from '@/lib/import/mmbak-sqlite-meta';
import { readMmbakExtension } from '@/lib/import/mmbak-extension';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json(
      {
        error:
          'Expected multipart/form-data with a file field named "file".',
      },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Could not read form data (file too large or malformed).' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file. Use field name "file".' },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 400 }
    );
  }

  const header = buf.subarray(0, 16).toString('utf8');
  if (!header.startsWith('SQLite format 3')) {
    return NextResponse.json(
      {
        error:
          'This file is not an SQLite database. Money Manager backups (.mmbak) should start with SQLite format 3.',
      },
      { status: 400 }
    );
  }

  let db: Database.Database;
  try {
    db = new Database(buf);
  } catch (e) {
    return NextResponse.json(
      {
        error: `Could not open SQLite file: ${e instanceof Error ? e.message : 'unknown error'}`,
      },
      { status: 400 }
    );
  }

  try {
    const hasTable = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ZINOUTCOME' LIMIT 1"
      )
      .get();
    if (!hasTable) {
      return NextResponse.json(
        {
          error:
            'Unrecognized backup: table ZINOUTCOME not found. This importer targets Money Manager mobile-style Core Data SQLite backups.',
        },
        { status: 400 }
      );
    }

    const detected = detectMmbakColumnMapping(db);

    const groupRows = db
      .prepare(buildZAssetGroupSelectSql(detected))
      .all() as MmbakGroupSource[];

    const mmbakGroupKindConvention = detectMmbakGroupKindConvention(groupRows);

    const assetRows = db
      .prepare(buildZAssetSelectSql(detected))
      .all() as MmbakAssetSource[];

    const activeAssets = assetRows.filter((a) => !(a.zisdel ?? 0));
    const assetsForPlan =
      activeAssets.length > 0 ? activeAssets : assetRows;

    const { structure, accountSpecs, resolveAssetKey } =
      buildMmbakStructureAndSpecs(groupRows, assetsForPlan, detected);

    const txRows = db
      .prepare(buildZInOutcomeSelectSql(db))
      .all() as MmbakTxRow[];

    const { rows, parseWarnings } = mmbakTransactionsToRawRows(
      txRows,
      resolveAssetKey
    );

    const mmbakExtension = readMmbakExtension(db);

    return NextResponse.json({
      sheetName: 'Money Manager (.mmbak)',
      header: [] as string[],
      rows,
      parseWarnings,
      source: 'mmbak',
      accountSpecs,
      structure,
      mmbakColumnDetection: detected,
      mmbakGroupKindConvention,
      mmbakExtension,
      stats: {
        assetGroupsInBackup: groupRows.filter((g) => !(g.zisdel ?? 0)).length,
        assetsPlanned: accountSpecs.length,
        assetsInBackup: assetRows.length,
        transactionsRead: txRows.length,
        importableRows: rows.length,
        mmbakCategories: mmbakExtension.categories.length,
        mmbakTags: mmbakExtension.tags.length,
        mmbakTxTagLinks: mmbakExtension.transactionTagLinks.length,
        mmbakBudgets: mmbakExtension.budgets.length,
        mmbakBudgetAmountLines: mmbakExtension.budgetAmounts.length,
        mmbakRecurringTemplates: mmbakExtension.recurringTemplates.length,
        mmbakFavoriteTemplates: mmbakExtension.favoriteTemplates.length,
        mmbakPortfolioKv: mmbakExtension.portfolioKv.length,
        mmbakStandaloneMemos: mmbakExtension.standaloneMemos.length,
      },
    });
  } finally {
    db.close();
  }
}
