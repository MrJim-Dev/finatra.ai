"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MmQuickCapture } from "@/components/mm-quick-capture";
import { createBrowserClient } from "@supabase/ssr";

type AccountOpt = { account_id: string; name: string };

function usePortfolioAccounts() {
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [portId, setPortId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: portfolios } = await supabase
        .from("portfolio")
        .select("port_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const pid = portfolios?.[0]?.port_id;
      if (!pid) return;
      setPortId(pid);

      const { data: accs } = await supabase
        .from("accounts")
        .select("account_id, name")
        .eq("port_id", pid)
        .order("name", { ascending: true });

      setAccounts((accs ?? []) as AccountOpt[]);
    }
    load();
  }, []);

  return { accounts, portId };
}

export function QuickCaptureFAB() {
  const [open, setOpen] = useState(false);
  const { accounts } = usePortfolioAccounts();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 md:h-14 md:w-14 rounded-full shadow-lg bg-background/90 backdrop-blur-sm"
        onClick={() => setOpen(true)}
        title="Quick Capture"
      >
        <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      <MmQuickCapture
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        defaultDate={today}
        onSuccess={() => {
          setOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
