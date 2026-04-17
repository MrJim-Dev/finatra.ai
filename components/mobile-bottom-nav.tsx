"use client";

import { usePathname, useRouter } from "next/navigation";
import { MmBottomNav, type MmMainNav } from "@/components/mm-bottom-nav";

export function MobileBottomNav({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!slug) return null;

  const base = `/dashboard/${slug}`;
  const active: MmMainNav = pathname.startsWith(`${base}/accounts`)
    ? "accounts"
    : pathname.startsWith(`${base}/categories`) || pathname.startsWith(`${base}/settings`)
      ? "more"
      : pathname === base || pathname.startsWith(`${base}/`)
        ? "ledger"
        : "ledger";

  const routes: Record<MmMainNav, string> = {
    ledger: base,
    stats: base,
    accounts: `${base}/accounts`,
    more: `${base}/settings`,
  };

  return (
    <MmBottomNav
      active={active}
      onChange={(nav) => router.push(routes[nav])}
      dayBadge={new Date().getDate().toString()}
    />
  );
}
