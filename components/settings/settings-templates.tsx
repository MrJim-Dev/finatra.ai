'use client';

import * as React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection } from '@/components/settings/settings-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type RecRow = {
  template_id: string;
  mm_uid: string;
  payload: Record<string, unknown>;
  created_at: string | null;
};

type FavRow = {
  template_id: string;
  mm_uid: string | null;
  payload: Record<string, unknown>;
  created_at: string | null;
};

function payloadLabel(p: Record<string, unknown>) {
  const m = String(
    p._finatra_note ?? p.ZMEMO ?? p.ZPAYEE ?? p.ZCONTENT ?? ''
  ).trim();
  if (m) return m.slice(0, 48);
  return String(p.ZUID ?? p.template_id ?? 'Template').slice(0, 32);
}

function TemplateTable({
  portId,
  recurring,
}: {
  portId: string;
  recurring: boolean;
}) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<(RecRow | FavRow)[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editJson, setEditJson] = React.useState('');
  const [editId, setEditId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const table = recurring ? 'recurring_templates' : 'favorite_templates';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('port_id', portId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({
        title: 'Could not load templates',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
    } else {
      setRows((data ?? []) as (RecRow | FavRow)[]);
    }
    setLoading(false);
  }, [portId, recurring, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function addTemplate() {
    setAdding(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const table = recurring ? 'recurring_templates' : 'favorite_templates';
    const base = {
      port_id: portId,
      user_id: user.id,
      payload: {
        _finatra_note: recurring
          ? 'New recurring template — edit JSON'
          : 'New favorite — edit JSON',
      },
    };
    const row = recurring
      ? { ...base, mm_uid: `manual:${crypto.randomUUID()}` }
      : { ...base, mm_uid: `manual:${crypto.randomUUID()}` };
    const { error } = await supabase.from(table).insert(row);
    setAdding(false);
    if (error) {
      toast({
        title: 'Could not create',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Template created' });
    await load();
  }

  function openEdit(row: RecRow | FavRow) {
    setEditId(row.template_id);
    setEditJson(JSON.stringify(row.payload ?? {}, null, 2));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editJson) as Record<string, unknown>;
    } catch {
      toast({
        title: 'Invalid JSON',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const table = recurring ? 'recurring_templates' : 'favorite_templates';
    const { error } = await supabase
      .from(table)
      .update({ payload: parsed })
      .eq('template_id', editId)
      .eq('port_id', portId);
    setSaving(false);
    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Template updated' });
    setEditOpen(false);
    await load();
  }

  async function remove(row: RecRow | FavRow) {
    if (!confirm('Delete this template?')) return;
    const supabase = createClient();
    const table = recurring ? 'recurring_templates' : 'favorite_templates';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('template_id', row.template_id)
      .eq('port_id', portId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Deleted' });
    await load();
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={adding}
          onClick={addTemplate}
          className="gap-1.5"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : null}
          New {recurring ? 'recurring' : 'favorite'}
        </Button>
      </div>
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-sm">No templates yet.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Summary</TableHead>
                <TableHead className="hidden md:table-cell">MM UID</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.template_id}>
                  <TableCell className="max-w-[240px]">
                    <span className="font-medium">
                      {payloadLabel(r.payload ?? {})}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-muted-foreground text-xs">
                      {r.mm_uid ?? '—'}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(r)}
                      aria-label="Edit JSON"
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit template payload (JSON)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            className="font-mono text-xs min-h-[240px]"
            spellCheck={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsTemplates({ portId }: { portId: string }) {
  return (
    <SettingsSection
      title="Quick-entry templates"
      description="Recurring rules and favorite transaction shortcuts from Money Manager (raw JSON). Edit carefully—structure matches the backup schema."
    >
      <Tabs defaultValue="recurring" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        <TabsContent value="recurring">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Full CRUD</Badge>
            <span className="text-muted-foreground text-xs">
              Import fills these; you can also add blank templates and edit JSON.
            </span>
          </div>
          <TemplateTable portId={portId} recurring />
        </TabsContent>
        <TabsContent value="favorites">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Full CRUD</Badge>
            <span className="text-muted-foreground text-xs">
              Favorites are quick-entry shapes from MM or created here.
            </span>
          </div>
          <TemplateTable portId={portId} recurring={false} />
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
}
