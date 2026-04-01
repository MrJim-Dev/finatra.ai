'use client';

import * as React from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection } from '@/components/settings/settings-section';

type TagRow = {
  tag_id: string;
  name: string;
  mm_uid: string | null;
  created_at: string | null;
};

export function SettingsTags({ portId }: { portId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TagRow | null>(null);
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tags')
      .select('tag_id, name, mm_uid, created_at')
      .eq('port_id', portId)
      .order('name');
    if (error) {
      toast({
        title: 'Could not load tags',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
    } else {
      setRows((data ?? []) as TagRow[]);
    }
    setLoading(false);
  }, [portId, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDialogOpen(true);
  }

  function openEdit(row: TagRow) {
    setEditing(row);
    setName(row.name);
    setDialogOpen(true);
  }

  async function saveTag() {
    const n = name.trim();
    if (!n) {
      toast({
        title: 'Name required',
        variant: 'destructive',
      });
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
          .from('tags')
          .update({ name: n })
          .eq('tag_id', editing.tag_id)
          .eq('port_id', portId);
        if (error) throw error;
        toast({ title: 'Tag updated' });
      } else {
        const { error } = await supabase.from('tags').insert({
          port_id: portId,
          user_id: user.id,
          name: n,
        });
        if (error) throw error;
        toast({ title: 'Tag created' });
      }
      setDialogOpen(false);
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

  async function remove(row: TagRow) {
    if (!confirm(`Delete tag “${row.name}”? Links to transactions will be removed.`))
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('tag_id', row.tag_id)
      .eq('port_id', portId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Tag deleted' });
    await load();
  }

  return (
    <SettingsSection
      title="Tags"
      description="Organize transactions with labels. Assign tags when editing a transaction, or import them from a Money Manager backup."
    >
      <div className="mb-4 flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          New tag
        </Button>
      </div>
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading tags…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-sm">
          No tags yet. Create one to start labeling transactions.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.tag_id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {r.mm_uid ? (
                      <Badge variant="secondary" className="font-normal">
                        Import
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Manual</span>
                    )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit tag' : 'New tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Business, Tax-deductible"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTag} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
