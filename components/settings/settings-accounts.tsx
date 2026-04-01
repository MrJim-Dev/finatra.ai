'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyAmount } from '@/lib/format-money';
import { usePortfolioCurrency } from '@/components/context/portfolio-currency-context';

type GroupType = 'default' | 'credit' | 'debit';

type AccountGroupRow = {
  group_id: string;
  group_name: string;
  group_type: string | null;
  port_id: string;
};

type AccountRow = {
  account_id: string;
  name: string;
  description: string | null;
  amount: number;
  group_id: string;
  in_total: boolean | null;
  hidden: boolean | null;
  currency: string | null;
  port_id: string;
};

function groupTypeLabel(t: string | null): string {
  const v = (t ?? 'default') as GroupType;
  if (v === 'credit') return 'Credit cards';
  if (v === 'debit') return 'Debit cards';
  return 'Default';
}

function groupTypeBadgeClass(t: string | null): string {
  const v = (t ?? 'default') as GroupType;
  if (v === 'credit') return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400';
  if (v === 'debit') return 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400';
  return 'border-border bg-muted/50 text-muted-foreground';
}

export function SettingsAccounts({
  portId,
  onSaved,
}: {
  portId: string;
  onSaved?: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();
  const portfolioCurrency = usePortfolioCurrency();
  const [groups, setGroups] = useState<AccountGroupRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupDialog, setGroupDialog] = useState<AccountGroupRow | null>(null);
  const [accountDialog, setAccountDialog] = useState<AccountRow | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<AccountGroupRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [gr, ac] = await Promise.all([
      supabase
        .from('account_groups')
        .select('group_id, group_name, group_type, port_id')
        .eq('port_id', portId)
        .order('group_name'),
      supabase
        .from('accounts')
        .select(
          'account_id, name, description, amount, group_id, in_total, hidden, currency, port_id'
        )
        .eq('port_id', portId)
        .order('name'),
    ]);

    if (gr.error) {
      console.error(gr.error);
      toast({
        title: 'Error',
        description: gr.error.message,
        variant: 'destructive',
      });
    } else {
      setGroups((gr.data ?? []) as AccountGroupRow[]);
    }

    if (ac.error) {
      console.error(ac.error);
      toast({
        title: 'Error',
        description: ac.error.message,
        variant: 'destructive',
      });
    } else {
      setAccounts((ac.data ?? []) as AccountRow[]);
    }

    setLoading(false);
  }, [portId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const accountsByGroup = useMemo(() => {
    const m = new Map<string, AccountRow[]>();
    for (const a of accounts) {
      const list = m.get(a.group_id) ?? [];
      list.push(a);
      m.set(a.group_id, list);
    }
    return m;
  }, [accounts]);

  const summary = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const g of groups) {
      const k = g.group_type ?? 'default';
      byType[k] = (byType[k] ?? 0) + 1;
    }
    const excludedFromTotals = accounts.filter((a) => a.in_total === false)
      .length;
    const hidden = accounts.filter((a) => a.hidden === true).length;
    const creditGroups = groups.filter((g) => (g.group_type ?? 'default') === 'credit')
      .length;
    return { byType, excludedFromTotals, hidden, creditGroups };
  }, [groups, accounts]);

  const refresh = () => {
    load();
    onSaved?.();
  };

  if (loading && groups.length === 0 && accounts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Loading accounts…</p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Accounts &amp; groups
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit group types (credit card groups appear under Liabilities on the
          Accounts page). Control whether each account counts toward portfolio
          totals and whether it is hidden from the list.
        </p>
      </div>

      <div className="bg-muted/40 rounded-xl border p-4">
        <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
          Database snapshot (this portfolio)
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <span className="text-muted-foreground">Credit-type groups: </span>
            <span className="font-medium tabular-nums">{summary.creditGroups}</span>
            <span className="text-muted-foreground text-xs">
              {' '}
              (should match groups you use for credit cards)
            </span>
          </li>
          <li>
            <span className="text-muted-foreground">Groups by type: </span>
            <span className="font-medium">
              {Object.entries(summary.byType)
                .map(([k, n]) => `${k}: ${n}`)
                .join(' · ') || '—'}
            </span>
          </li>
          <li>
            <span className="text-muted-foreground">
              Accounts excluded from totals{' '}
              <code className="text-xs">(in_total = false)</code>:{' '}
            </span>
            <span className="font-medium tabular-nums">
              {summary.excludedFromTotals}
            </span>
          </li>
          <li>
            <span className="text-muted-foreground">Hidden accounts: </span>
            <span className="font-medium tabular-nums">{summary.hidden}</span>
          </li>
        </ul>
        <p className="text-muted-foreground mt-3 text-xs">
          For raw SQL checks in Supabase, see{' '}
          <code className="rounded bg-background px-1 py-0.5 text-[11px]">
            scripts/audit-account-metadata.sql
          </code>
          .
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((g) => {
          const accs = accountsByGroup.get(g.group_id) ?? [];
          return (
            <div
              key={g.group_id}
              className="border-border rounded-xl border bg-card shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <WalletCards className="text-muted-foreground size-4" />
                  <span className="font-medium">{g.group_name}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-normal', groupTypeBadgeClass(g.group_type))}
                  >
                    {groupTypeLabel(g.group_type)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setGroupDialog(g)}
                    aria-label={`Edit group ${g.group_name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive size-8"
                    disabled={accs.length > 0}
                    onClick={() => setDeleteGroup(g)}
                    aria-label={`Delete group ${g.group_name}`}
                    title={
                      accs.length > 0
                        ? 'Move or delete accounts in this group first'
                        : 'Delete group'
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <ul className="divide-y">
                {accs.length === 0 ? (
                  <li className="text-muted-foreground px-4 py-3 text-sm">
                    No accounts in this group.
                  </li>
                ) : (
                  accs.map((a) => (
                    <li
                      key={a.account_id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          {a.hidden ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Hidden
                            </Badge>
                          ) : null}
                          {a.in_total === false ? (
                            <Badge variant="outline" className="text-[10px]">
                              Excluded from totals
                            </Badge>
                          ) : null}
                        </div>
                        {a.description ? (
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {a.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm tabular-nums">
                          {formatMoneyAmount(
                            Number(a.amount),
                            a.currency ?? portfolioCurrency
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => setAccountDialog(a)}
                          aria-label={`Edit ${a.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {groupDialog ? (
        <EditGroupDialog
          group={groupDialog}
          onClose={() => setGroupDialog(null)}
          onSaved={refresh}
        />
      ) : null}

      {accountDialog ? (
        <EditAccountDialog
          account={accountDialog}
          groups={groups}
          onClose={() => setAccountDialog(null)}
          onSaved={refresh}
        />
      ) : null}

      {deleteGroup ? (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteGroup(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete group?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{deleteGroup.group_name}&quot;.
                Only empty groups can be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  const { error } = await supabase
                    .from('account_groups')
                    .delete()
                    .eq('group_id', deleteGroup.group_id)
                    .eq('port_id', portId);
                  setDeleteGroup(null);
                  if (error) {
                    toast({
                      title: 'Could not delete',
                      description: error.message,
                      variant: 'destructive',
                    });
                  } else {
                    toast({ title: 'Group deleted' });
                    refresh();
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

function EditGroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: AccountGroupRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();
  const [name, setName] = useState(group.group_name);
  const [type, setType] = useState<GroupType>(
    (group.group_type as GroupType) ?? 'default'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(group.group_name);
    setType((group.group_type as GroupType) ?? 'default');
  }, [group]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('account_groups')
      .update({
        group_name: name.trim(),
        group_type: type,
      })
      .eq('group_id', group.group_id)
      .eq('port_id', group.port_id);

    setSaving(false);
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Group updated' });
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit account group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="eg-name">Group name</Label>
            <Input
              id="eg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Group type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as GroupType)}
              className="gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="eg-default" />
                <Label htmlFor="eg-default" className="font-normal">
                  Default (assets-style)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="eg-credit" />
                <Label htmlFor="eg-credit" className="font-normal">
                  Credit cards (Liabilities layout)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="eg-debit" />
                <Label htmlFor="eg-debit" className="font-normal">
                  Debit cards
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({
  account,
  groups,
  onClose,
  onSaved,
}: {
  account: AccountRow;
  groups: AccountGroupRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();
  const [name, setName] = useState(account.name);
  const [description, setDescription] = useState(account.description ?? '');
  const [groupId, setGroupId] = useState(account.group_id);
  const [amount, setAmount] = useState(String(account.amount));
  const [includeInTotals, setIncludeInTotals] = useState(
    account.in_total !== false
  );
  const [hidden, setHidden] = useState(!!account.hidden);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(account.name);
    setDescription(account.description ?? '');
    setGroupId(account.group_id);
    setAmount(String(account.amount));
    setIncludeInTotals(account.in_total !== false);
    setHidden(!!account.hidden);
  }, [account]);

  const save = async () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt)) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a valid number for balance.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('accounts')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        group_id: groupId,
        amount: amt,
        in_total: includeInTotals,
        hidden,
      })
      .eq('account_id', account.account_id)
      .eq('port_id', account.port_id);

    setSaving(false);
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Account updated' });
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto py-2">
          <div className="space-y-2">
            <Label htmlFor="ea-name">Name</Label>
            <Input
              id="ea-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ea-desc">Description</Label>
            <Textarea
              id="ea-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.group_id} value={g.group_id}>
                    {g.group_name} ({groupTypeLabel(g.group_type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ea-amount">Ledger balance</Label>
            <Input
              id="ea-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-muted-foreground text-[11px] leading-snug">
              Normally this stays in sync with transactions; adjust only if you
              need a manual correction.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="ea-totals" className="font-medium">
                Include in portfolio totals
              </Label>
              <p className="text-muted-foreground text-xs">
                Turn off to exclude from Assets / Liabilities / Total on the
                Accounts page.
              </p>
            </div>
            <Switch
              id="ea-totals"
              checked={includeInTotals}
              onCheckedChange={setIncludeInTotals}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="ea-hidden" className="font-medium">
                Hidden
              </Label>
              <p className="text-muted-foreground text-xs">
                Hidden accounts do not appear on the Accounts list.
              </p>
            </div>
            <Switch
              id="ea-hidden"
              checked={hidden}
              onCheckedChange={setHidden}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
