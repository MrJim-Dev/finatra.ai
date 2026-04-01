'use client';

import * as React from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection } from '@/components/settings/settings-section';

type KvRow = {
  id: number;
  source: string;
  key: string;
  value: unknown;
  created_at: string | null;
};

const SOURCES = [
  { value: 'mm_property', label: 'MM property' },
  { value: 'mm_etc', label: 'MM misc (ZETC)' },
  { value: 'mm_memo', label: 'MM memo export' },
  { value: 'custom', label: 'Custom' },
];

export function SettingsPortfolioKv({ portId }: { portId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<KvRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KvRow | null>(null);
  const [source, setSource] = React.useState('custom');
  const [key, setKey] = React.useState('');
  const [json, setJson] = React.useState('{}');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('portfolio_kv')
      .select('id, source, key, value, created_at')
      .eq('port_id', portId)
      .order('source')
      .order('key');
    if (error) {
      toast({
        title: 'Could not load entries',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
    } else {
      setRows((data ?? []) as KvRow[]);
    }
    setLoading(false);
  }, [portId, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setSource('custom');
    setKey('');
    setJson('{}');
    setOpen(true);
  }

  function openEdit(row: KvRow) {
    setEditing(row);
    setSource(row.source);
    setKey(row.key);
    try {
      setJson(JSON.stringify(row.value ?? {}, null, 2));
    } catch {
      setJson('{}');
    }
    setOpen(true);
  }

  async function save() {
    const k = key.trim();
    if (!k) {
      toast({ title: 'Key required', variant: 'destructive' });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      toast({ title: 'Value must be valid JSON', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from('portfolio_kv')
          .update({ source, key: k, value: parsed as object })
          .eq('id', editing.id)
          .eq('port_id', portId);
        if (error) throw error;
        toast({ title: 'Entry updated' });
      } else {
        const { error } = await supabase.from('portfolio_kv').insert({
          port_id: portId,
          user_id: user.id,
          source,
          key: k,
          value: parsed as object,
        });
        if (error) throw error;
        toast({ title: 'Entry created' });
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: KvRow) {
    if (!confirm(`Delete “${row.source}:${row.key}”?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('portfolio_kv')
      .delete()
      .eq('id', row.id)
      .eq('port_id', portId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Removed' });
    await load();
  }

  return (
    <SettingsSection
      title="Imported & custom data"
      description="Key/value snapshots from Money Manager (properties, ZETC, memos) plus any custom JSON you add for integrations or notes."
    >
      <div className="mb-4 flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          Add entry
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-sm">
          No entries. They appear after an .mmbak import, or add your own.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="hidden lg:table-cell">Preview</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.source}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-medium">
                    {r.key}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-md truncate font-mono text-xs lg:table-cell">
                    {JSON.stringify(r.value).slice(0, 120)}
                    {JSON.stringify(r.value).length > 120 ? '…' : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(r)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      onClick={() => remove(r)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="kv-key">Key</Label>
              <Input
                id="kv-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="unique_key"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kv-json">Value (JSON)</Label>
              <Textarea
                id="kv-json"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                className="font-mono text-xs min-h-[140px]"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
