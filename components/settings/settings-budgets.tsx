'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type Line = {
  id: number;
  target_uid: string | null;
  money_str: string | null;
  amount: number | null;
};

type Budget = {
  budget_id: string;
  label: string | null;
  day_str: string | null;
  period_type: number | null;
  mm_uid: string | null;
  budget_amount_lines: Line[] | null;
};

export function SettingsBudgets({ portId }: { portId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Budget[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [addingLineFor, setAddingLineFor] = React.useState<string | null>(null);
  const [newLineAmount, setNewLineAmount] = React.useState('');
  const [newLineTarget, setNewLineTarget] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: budgets, error: bErr } = await supabase
      .from('budgets')
      .select('budget_id, label, day_str, period_type, mm_uid, created_at')
      .eq('port_id', portId)
      .order('created_at', { ascending: false });

    if (bErr) {
      toast({
        title: 'Could not load budgets',
        description: bErr.message,
        variant: 'destructive',
      });
      setRows([]);
      setLoading(false);
      return;
    }

    const list = budgets ?? [];
    const ids = list.map((b) => b.budget_id as string);
    let linesByBudget = new Map<string, Line[]>();
    if (ids.length > 0) {
      const { data: lines, error: lErr } = await supabase
        .from('budget_amount_lines')
        .select('id, budget_id, target_uid, money_str, amount')
        .in('budget_id', ids);
      if (!lErr && lines) {
        linesByBudget = new Map();
        for (const ln of lines as (Line & { budget_id: string })[]) {
          const bid = ln.budget_id;
          const arr = linesByBudget.get(bid) ?? [];
          arr.push({
            id: ln.id,
            target_uid: ln.target_uid,
            money_str: ln.money_str,
            amount: ln.amount,
          });
          linesByBudget.set(bid, arr);
        }
      }
    }

    setRows(
      list.map((b) => ({
        budget_id: b.budget_id as string,
        label: b.label as string | null,
        day_str: b.day_str as string | null,
        period_type: b.period_type as number | null,
        mm_uid: b.mm_uid as string | null,
        budget_amount_lines: linesByBudget.get(b.budget_id as string) ?? [],
      }))
    );
    setLoading(false);
  }, [portId, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function createBudget() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const mm_uid = `manual:${crypto.randomUUID()}`;
    const { error } = await supabase.from('budgets').insert({
      port_id: portId,
      user_id: user.id,
      mm_uid,
      label: 'New budget',
      raw: {},
    });
    if (error) {
      toast({
        title: 'Could not create budget',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Budget created' });
    await load();
  }

  async function updateBudgetLabel(id: string, label: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('budgets')
      .update({ label })
      .eq('budget_id', id)
      .eq('port_id', portId);
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    await load();
  }

  async function deleteBudget(id: string) {
    if (!confirm('Delete this budget and all its amount lines?')) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('budget_id', id)
      .eq('port_id', portId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Budget deleted' });
    await load();
  }

  async function addLine(budgetId: string) {
    const amt = parseFloat(newLineAmount.replace(/,/g, ''));
    if (!Number.isFinite(amt)) {
      toast({
        title: 'Invalid amount',
        variant: 'destructive',
      });
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('budget_amount_lines').insert({
      budget_id: budgetId,
      target_uid: newLineTarget.trim() || null,
      money_str: newLineAmount,
      amount: amt,
      raw: {},
    });
    if (error) {
      toast({
        title: 'Could not add line',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setAddingLineFor(null);
    setNewLineAmount('');
    setNewLineTarget('');
    toast({ title: 'Line added' });
    await load();
  }

  async function deleteLine(lineId: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from('budget_amount_lines')
      .delete()
      .eq('id', lineId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Line removed' });
    await load();
  }

  return (
    <SettingsSection
      title="Budgets"
      description="Targets and limits imported from Money Manager, or created here. Expand a row to manage amount lines."
    >
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={createBudget}
        >
          <Plus className="size-4" />
          New budget
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-sm">
          No budgets. Import a backup or create one manually.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => {
            const lines = b.budget_amount_lines ?? [];
            const isOpen = openId === b.budget_id;
            return (
              <Collapsible
                key={b.budget_id}
                open={isOpen}
                onOpenChange={(o) => setOpenId(o ? b.budget_id : null)}
              >
                <div
                  className={cn(
                    'rounded-lg border bg-background/80 transition-colors',
                    isOpen && 'ring-primary/20 ring-2'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                        {isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Input
                      className="max-w-xs font-medium"
                      defaultValue={b.label ?? b.day_str ?? 'Budget'}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== (b.label ?? '')) {
                          void updateBudgetLabel(b.budget_id, v);
                        }
                      }}
                    />
                    {b.mm_uid?.startsWith('manual:') ? (
                      <Badge variant="outline">Manual</Badge>
                    ) : (
                      <Badge variant="secondary">Import</Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setAddingLineFor(
                            addingLineFor === b.budget_id ? null : b.budget_id
                          )
                        }
                      >
                        Add line
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteBudget(b.budget_id)}
                        aria-label="Delete budget"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {addingLineFor === b.budget_id && (
                    <div className="border-t px-3 py-3 flex flex-wrap items-end gap-3 bg-muted/20">
                      <div className="space-y-1">
                        <Label className="text-xs">Target UID (optional)</Label>
                        <Input
                          value={newLineTarget}
                          onChange={(e) => setNewLineTarget(e.target.value)}
                          placeholder="Category / account UID"
                          className="w-48"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          value={newLineAmount}
                          onChange={(e) => setNewLineAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-28"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addLine(b.budget_id)}
                      >
                        Add
                      </Button>
                    </div>
                  )}

                  <CollapsibleContent>
                    <div className="border-t px-3 py-2 text-sm">
                      {lines.length === 0 ? (
                        <p className="text-muted-foreground py-2 text-xs">
                          No amount lines.
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {lines.map((ln) => (
                            <li
                              key={ln.id}
                              className="flex items-center justify-between gap-2 py-2"
                            >
                              <span className="text-muted-foreground truncate text-xs">
                                {ln.target_uid ?? '—'} ·{' '}
                                <span className="text-foreground font-medium tabular-nums">
                                  {ln.amount != null
                                    ? ln.amount.toLocaleString()
                                    : ln.money_str ?? '—'}
                                </span>
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 text-destructive"
                                onClick={() => deleteLine(ln.id)}
                                aria-label="Remove line"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}
