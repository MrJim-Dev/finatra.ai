'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Database,
  PiggyBank,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  WalletCards,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { SettingsGeneral } from '@/components/settings/settings-general';
import { SettingsTags } from '@/components/settings/settings-tags';
import { SettingsBudgets } from '@/components/settings/settings-budgets';
import { SettingsTemplates } from '@/components/settings/settings-templates';
import { SettingsPortfolioKv } from '@/components/settings/settings-portfolio-kv';
import { SettingsDataImport } from '@/components/settings/settings-data-import';
import { SettingsAccounts } from '@/components/settings/settings-accounts';
import { useRouter } from 'next/navigation';

export type PortfolioSettingsProps = {
  portfolio: {
    port_id: string;
    slug: string;
    title: string;
    default_currency: string;
    color: string | null;
  };
  /** Deep link from e.g. `/settings?tab=accounts` */
  initialTab?: string;
};

export function PortfolioSettingsShell({
  portfolio,
  initialTab,
}: PortfolioSettingsProps) {
  const router = useRouter();
  const base = `/dashboard/${portfolio.slug}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="relative overflow-hidden border-b px-4 py-8 md:px-8"
        style={{
          background:
            portfolio.color &&
            /^#[0-9A-Fa-f]{3,8}$/i.test(portfolio.color.trim())
              ? `linear-gradient(135deg, ${portfolio.color.trim()}22 0%, transparent 55%), hsl(var(--muted) / 0.35)`
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 50%), hsl(var(--muted) / 0.35)',
        }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            href={base}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to activity
          </Link>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-background/80 flex size-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur">
                <Sparkles className="text-primary size-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Portfolio
                </p>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {portfolio.title}
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:ml-auto md:text-right">
              Tune defaults, manage tags and budgets, inspect imported MM data,
              and control how new information flows in.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8">
        <Tabs
          defaultValue={initialTab === 'accounts' ? 'accounts' : 'general'}
          className="w-full"
        >
          <ScrollArea className="w-full pb-2">
            <TabsList className="bg-muted/60 inline-flex h-auto w-max min-w-full justify-start gap-1 rounded-xl p-1 md:min-w-0">
              <TabsTrigger
                value="accounts"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <WalletCards className="size-4 shrink-0" />
                <span className="hidden sm:inline">Accounts</span>
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="tags"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <Tag className="size-4 shrink-0" />
                <span className="hidden sm:inline">Tags</span>
              </TabsTrigger>
              <TabsTrigger
                value="budgets"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <PiggyBank className="size-4 shrink-0" />
                <span className="hidden sm:inline">Budgets</span>
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <Timer className="size-4 shrink-0" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger
                value="kv"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <Database className="size-4 shrink-0" />
                <span className="hidden sm:inline">Imported KV</span>
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="gap-1.5 rounded-lg px-3 py-2 data-[state=active]:shadow-sm"
              >
                <Settings2 className="size-4 shrink-0" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="mt-6 space-y-6">
            <TabsContent value="accounts" className="mt-0 outline-none">
              <SettingsAccounts
                portId={portfolio.port_id}
                onSaved={() => router.refresh()}
              />
            </TabsContent>
            <TabsContent value="general" className="mt-0 outline-none">
              <SettingsGeneral
                portId={portfolio.port_id}
                initialTitle={portfolio.title}
                initialCurrency={portfolio.default_currency}
                onSaved={() => router.refresh()}
              />
            </TabsContent>
            <TabsContent value="tags" className="mt-0 outline-none">
              <SettingsTags portId={portfolio.port_id} />
            </TabsContent>
            <TabsContent value="budgets" className="mt-0 outline-none">
              <SettingsBudgets portId={portfolio.port_id} />
            </TabsContent>
            <TabsContent value="templates" className="mt-0 outline-none">
              <SettingsTemplates portId={portfolio.port_id} />
            </TabsContent>
            <TabsContent value="kv" className="mt-0 outline-none">
              <SettingsPortfolioKv portId={portfolio.port_id} />
            </TabsContent>
            <TabsContent value="data" className="mt-0 outline-none">
              <SettingsDataImport
                portId={portfolio.port_id}
                slug={portfolio.slug}
                onDataChanged={() => router.refresh()}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
