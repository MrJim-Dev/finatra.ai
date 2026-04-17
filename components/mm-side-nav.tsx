"use client";

import * as React from "react";
import {
  BookOpen,
  BarChart3,
  Wallet,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MmMainNav } from "@/components/mm-bottom-nav";

type Props = {
  active: MmMainNav;
  onChange: (nav: MmMainNav) => void;
  onQuickCapture: () => void;
};

const items: { id: MmMainNav; label: string; icon: typeof BookOpen; hint: string }[] = [
  { id: "ledger", label: "Ledger", icon: BookOpen, hint: "Daily transactions" },
  { id: "stats", label: "Stats", icon: BarChart3, hint: "Monthly breakdown" },
  { id: "accounts", label: "Accounts", icon: Wallet, hint: "Balances & groups" },
  { id: "more", label: "More", icon: MoreHorizontal, hint: "Import, categories" },
];

export function MmSideNav({ active, onChange, onQuickCapture }: Props) {
  return (
    <aside className="hidden shrink-0 border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex md:w-60 md:flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="bg-foreground text-background grid size-8 place-items-center rounded-lg font-bold">
          ƒ
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Finatra</span>
          <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
            AI Finance
          </span>
        </div>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onQuickCapture}
          className="group bg-accent text-accent-foreground hover:bg-accent/90 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4" />
            Quick capture
          </span>
          <kbd className="bg-background/20 rounded px-1.5 py-0.5 text-[10px] font-mono tracking-wide">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="mt-5 flex-1 px-3">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ id, label, icon: Icon, hint }) => {
            const isOn = active === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    isOn
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                  aria-current={isOn ? "page" : undefined}
                >
                  <Icon
                    className={cn("size-4 shrink-0", isOn ? "text-accent" : "opacity-80")}
                    strokeWidth={1.9}
                  />
                  <span className="flex flex-col leading-tight">
                    <span>{label}</span>
                    <span className="text-muted-foreground text-[10px]">{hint}</span>
                  </span>
                  {isOn && (
                    <span className="bg-accent absolute top-2 bottom-2 left-0 w-0.5 rounded-r-full" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-border/60 text-muted-foreground mt-auto border-t px-5 py-4 text-[10px]">
        <p className="leading-relaxed">
          Finatra · built with Next.js · Supabase · Claude
        </p>
      </div>
    </aside>
  );
}
