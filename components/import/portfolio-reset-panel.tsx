'use client';

import * as React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export const PORTFOLIO_RESET_CONFIRM_PHRASE =
  'DELETE_PORTFOLIO_TRANSACTIONS_AND_ACCOUNTS';

type Props = {
  portId: string;
  onResetComplete: () => void | Promise<void>;
};

export function PortfolioResetPanel({ portId, onResetComplete }: Props) {
  const { toast } = useToast();
  const [ack, setAck] = React.useState(false);
  const [phrase, setPhrase] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const canSubmit =
    ack && phrase === PORTFOLIO_RESET_CONFIRM_PHRASE && !busy;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const body: {
        confirm: string;
        port_id: string;
        secret?: string;
      } = {
        confirm: PORTFOLIO_RESET_CONFIRM_PHRASE,
        port_id: portId,
      };
      if (secret.trim()) body.secret = secret.trim();

      const res = await fetch('/api/import/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Reset failed',
          description: data.error ?? res.statusText,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Portfolio financial data cleared',
        description: data.message,
      });
      setPhrase('');
      setSecret('');
      setAck(false);
      await onResetComplete();
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not reach the server while resetting.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-5" />
          Reset this portfolio
        </CardTitle>
        <CardDescription>
          Removes <strong>all</strong> rows from{' '}
          <code className="text-xs">transactions</code>, import extras (
          <code className="text-xs">tags</code>,{' '}
          <code className="text-xs">budgets</code>, templates,{' '}
          <code className="text-xs">portfolio_kv</code>),{' '}
          <code className="text-xs">accounts</code>, and{' '}
          <code className="text-xs">account_groups</code> for{' '}
          <strong>this portfolio only</strong>. The portfolio record and
          categories are not deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/5 rounded-lg border p-4 text-sm"
        >
          <p className="font-medium text-destructive">Irreversible</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            There is no undo. Optional: set{' '}
            <code className="text-xs">RESET_FINANCIAL_DATA_SECRET</code> in{' '}
            <code className="text-xs">.env.local</code> — then enter the same
            value in the Secret field below.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="border-input mt-1 rounded"
            />
            <span>
              I understand this will permanently delete all transactions,
              import metadata, and accounts for this portfolio.
            </span>
          </Label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-phrase" className="text-xs">
              Type this phrase exactly
            </Label>
            <code className="bg-muted mb-1 rounded px-2 py-1 text-xs">
              {PORTFOLIO_RESET_CONFIRM_PHRASE}
            </code>
            <Input
              id="reset-phrase"
              autoComplete="off"
              placeholder={PORTFOLIO_RESET_CONFIRM_PHRASE}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-secret" className="text-xs">
              Secret (only if RESET_FINANCIAL_DATA_SECRET is set on the server)
            </Label>
            <Input
              id="reset-secret"
              type="password"
              autoComplete="off"
              placeholder="Optional"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={busy}
            />
          </div>

          <Button
            variant="destructive"
            className="w-fit gap-2"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Clear transactions &amp; accounts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
