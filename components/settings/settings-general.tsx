'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection } from '@/components/settings/settings-section';

type Props = {
  portId: string;
  initialTitle: string;
  initialCurrency: string;
  onSaved?: () => void;
};

export function SettingsGeneral({
  portId,
  initialTitle,
  initialCurrency,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(initialTitle);
  const [currency, setCurrency] = React.useState(
    initialCurrency.slice(0, 3).toUpperCase()
  );
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setTitle(initialTitle);
    setCurrency(initialCurrency.slice(0, 3).toUpperCase());
  }, [initialTitle, initialCurrency]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const cur = currency.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
      if (cur.length !== 3) {
        toast({
          title: 'Invalid currency',
          description: 'Use a 3-letter ISO code (e.g. USD, EUR).',
          variant: 'destructive',
        });
        return;
      }
      const { error } = await supabase
        .from('portfolio')
        .update({
          title: title.trim() || 'Portfolio',
          default_currency: cur,
        })
        .eq('port_id', portId);

      if (error) throw error;
      toast({ title: 'Saved', description: 'Portfolio preferences updated.' });
      onSaved?.();
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      title="Portfolio defaults"
      description="These values apply when an account or transaction does not specify its own currency."
    >
      <form onSubmit={onSave} className="flex max-w-md flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="pf-title">Display title</Label>
          <Input
            id="pf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Personal"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-cur">Default currency</Label>
          <Input
            id="pf-cur"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            maxLength={3}
            className="max-w-[8rem] font-mono uppercase"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={busy} className="w-fit gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </form>
    </SettingsSection>
  );
}
