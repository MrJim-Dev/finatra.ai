'use client';

import * as React from 'react';
import Link from 'next/link';
import { Database, FolderTree, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortfolioImportSheet } from '@/components/import/portfolio-import-sheet';
import { SettingsSection } from '@/components/settings/settings-section';

type Props = {
  portId: string;
  slug: string;
  onDataChanged: () => void | Promise<void>;
};

export function SettingsDataImport({ portId, slug, onDataChanged }: Props) {
  const [importOpen, setImportOpen] = React.useState(false);

  return (
    <>
      <SettingsSection
        title="Data & import"
        description="Bring in Excel or Money Manager backups, or wipe this portfolio’s ledger to start over."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10 p-5 text-left transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="bg-primary/10 text-primary mb-3 inline-flex size-10 items-center justify-center rounded-lg">
              <Upload className="size-5" />
            </div>
            <h4 className="font-semibold">Import transactions</h4>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Excel (.xlsx) or Money Manager (.mmbak) with budgets, tags, and
              templates when available.
            </p>
            <span className="text-primary mt-3 inline-flex items-center text-sm font-medium group-hover:underline">
              Open import
            </span>
          </button>

          <Link
            href={`/dashboard/${slug}/categories`}
            className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10 p-5 text-left transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="bg-primary/10 text-primary mb-3 inline-flex size-10 items-center justify-center rounded-lg">
              <FolderTree className="size-5" />
            </div>
            <h4 className="font-semibold">Category tree</h4>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Full CRUD for income & expense categories, including hierarchy.
            </p>
            <span className="text-primary mt-3 inline-flex items-center text-sm font-medium group-hover:underline">
              Manage categories →
            </span>
          </Link>
        </div>

        <div className="border-muted mt-6 rounded-lg border border-dashed p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Database className="text-muted-foreground size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Danger zone</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                To reset this portfolio’s transactions, accounts, tags, budgets,
                and related import data, use the{' '}
                <strong>Reset</strong> tab in the main import sheet (open import
                above → Reset tab), or we can add a dedicated control here later.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setImportOpen(true)}
            >
              Open import / reset
            </Button>
          </div>
        </div>
      </SettingsSection>

      <PortfolioImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        portfolioId={portId}
        onDataChanged={onDataChanged}
      />
    </>
  );
}
