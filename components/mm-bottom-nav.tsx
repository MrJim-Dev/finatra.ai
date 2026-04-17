"use client";

import { BookOpen, BarChart3, Wallet, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type MmMainNav = "ledger" | "stats" | "accounts" | "more";

type Props = {
  active: MmMainNav;
  onChange: (nav: MmMainNav) => void;
  /** e.g. today's day number for a badge on Trans */
  dayBadge?: string;
};

const items: { id: MmMainNav; label: string; icon: typeof BookOpen }[] = [
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export function MmBottomNav({ active, onChange, dayBadge }: Props) {
  return (
    <nav
      className="bg-background/80 supports-backdrop-filter:backdrop-blur-xl fixed right-0 bottom-0 left-0 z-40 border-t border-border/60 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-2 pt-1.5">
        {items.map(({ id, label, icon: Icon }) => {
          const isOn = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-all",
                isOn ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isOn ? "page" : undefined}
            >
              <span className="relative flex size-6 items-center justify-center">
                <Icon
                  className={cn("size-5 transition-transform", isOn && "scale-110")}
                  strokeWidth={isOn ? 2.25 : 1.75}
                />
                {id === "ledger" && dayBadge ? (
                  <span className="bg-accent text-accent-foreground absolute -top-1 -right-2 min-w-[1.1rem] rounded-full px-1 text-center text-[9px] leading-tight font-semibold">
                    {dayBadge}
                  </span>
                ) : null}
              </span>
              <span className="truncate tracking-wide">{label}</span>
              <span
                className={cn(
                  "absolute bottom-0 h-0.5 w-6 rounded-full transition-all",
                  isOn ? "bg-foreground" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
