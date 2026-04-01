'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImportStructurePreview as Structure } from '@/lib/import/mmbak-structure';
import { MMBAK_TO_FINATRA_MAP } from '@/lib/import/mmbak-structure';

type Props = {
  structure: Structure;
};

export function ImportStructurePreviewCard({ structure }: Props) {
  const m = MMBAK_TO_FINATRA_MAP;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schema mapping</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Backup <code className="text-xs">{m.source}</code> → Finatra /
            Postgres. Groups become{' '}
            <code className="text-xs">{m.account_groups.finatraTable}</code>;
            accounts → <code className="text-xs">{m.accounts.finatraTable}</code>
            ; transactions →{' '}
            <code className="text-xs">{m.transactions.finatraTable}</code>.
            Existing accounts are matched by name (case-insensitive); missing
            groups and accounts are created before you confirm the transaction
            import.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <p className="text-foreground font-medium">Account groups</p>
            <p>
              {m.account_groups.mmTable}.{m.account_groups.mmColumns.name} →{' '}
              {m.account_groups.finatraColumns.name}
            </p>
          </div>
          <div>
            <p className="text-foreground font-medium">Accounts</p>
            <p>
              {m.accounts.mmTable} ({m.accounts.mmColumns.display}) +{' '}
              {m.accounts.mmColumns.groupLink} →{' '}
              {m.accounts.finatraColumns.name} +{' '}
              {m.accounts.finatraColumns.group}
            </p>
          </div>
          <div>
            <p className="text-foreground font-medium">Transactions</p>
            <p>
              {m.transactions.mmTable} ({m.transactions.mmColumns.type}, …) →{' '}
              {m.transactions.finatraColumns.type}, …
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Groups ({structure.groups.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Each Money Manager group UID maps to one{' '}
            <code className="text-xs">account_groups</code> row (created or
            matched by name in this portfolio).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(220px,35vh)] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MM ZUID</TableHead>
                  <TableHead>MM name</TableHead>
                  <TableHead>→ group_name</TableHead>
                  <TableHead>group_type</TableHead>
                  <TableHead>ZSTATUS</TableHead>
                  <TableHead>MM raw kind</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structure.groups.map((g) => (
                  <TableRow key={g.mmUid}>
                    <TableCell className="font-mono text-[10px]">
                      {g.mmUid}
                    </TableCell>
                    <TableCell className="text-xs">{g.mmName}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {g.finatraGroupName}
                    </TableCell>
                    <TableCell className="text-xs">{g.groupType}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[10px]">
                      {g.mmGroupStatusRaw === null ||
                      g.mmGroupStatusRaw === undefined
                        ? '—'
                        : String(g.mmGroupStatusRaw)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[10px]">
                      {g.mmGroupKindRaw === null || g.mmGroupKindRaw === undefined
                        ? '—'
                        : String(g.mmGroupKindRaw)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Accounts ({structure.accounts.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Each asset becomes one <code className="text-xs">accounts</code>{' '}
            row in the correct group. Names match transaction labels (including
            transfer counterparties).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(320px,45vh)] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finatra name</TableHead>
                  <TableHead>MM ZASSET ZUID</TableHead>
                  <TableHead>MM ZGROUPUID</TableHead>
                  <TableHead>→ Group</TableHead>
                  <TableHead>CCY</TableHead>
                  <TableHead>In totals</TableHead>
                  <TableHead>Hidden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structure.accounts.map((a) => (
                  <TableRow key={a.mmAssetUid}>
                    <TableCell className="text-xs font-medium">
                      {a.finatraAccountName}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {a.mmAssetUid}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {a.mmGroupUid}
                    </TableCell>
                    <TableCell className="text-xs">{a.finatraGroupName}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {a.currency ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.inTotal ? 'yes' : 'no'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.hidden ? 'yes' : 'no'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
