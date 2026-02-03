import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { type ColumnDef, type Id, DataTableRef } from '@/components/compound/table/data-table';
import { Button } from '@/components/ui/button';
import { Icon, Inline, Stack, Text } from '@/components/foundations';
import { StatusBadge } from '@/components/compound/badges';

import { QueryDataTable } from '@/modules/shared/components/query-data-table';
import { formatBytes, getLatestHS } from '@/lib/format';
import { enableNode } from '../api/update-node';
import { ConnectionIndicator } from './connection-indicator';
import { NodeInfo } from './node-info';
import { Dropdown } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';
import { useDialog } from '@/components/compound/dialogs';
import { deleteNode } from '../api/delete-node';
import { toast } from '../../../components/compound/toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateResourceFamily } from '../../../lib/react-query';

type Filters = {
  search: string;
  status: '' | 'online' | 'offline' | 'iddle';
  type: '' | 'node' | 'gateway';
};

export type RemoteRow = {
  id: Id;
  status: 'online' | 'offline';
  enabled: boolean;
  name: string;
  isGateway: boolean;
  latestHandshakeTimestamp: number;
  transferRx: number;
  transferTx: number;
  alerts?: Array<{
    tone: 'warning' | 'destructive' | 'info';
    label: string; // "Update required", "Credentials expiring", etc.
    description?: string; // tooltip / expanded
    actionLabel?: string; // "Update", "Rotate", etc.
  }>;
};

function TrafficLine({ id, dir, value }: { id: number; dir: 'rx' | 'tx'; value?: number }) {
  const has = !!value && value > 0;

  const prevRef = React.useRef<number>(undefined);
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    const prev = prevRef.current;

    if (value && prev && value > prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 650);
      return () => clearTimeout(t);
    }

    prevRef.current = value;
  }, [id, dir, value]);

  const label = dir === 'rx' ? 'RX:' : 'TX:';
  const arrowIcon = dir === 'rx' ? 'arrowDown' : 'arrowUp';

  const toneClass =
    has && pulse ? (dir === 'rx' ? 'text-emerald-600 dark:text-emerald-500' : 'text-sky-600 dark:text-sky-500') : 'text-muted-foreground';

  return (
    <Inline className={`items-center gap-2`}>
      <Icon name={arrowIcon} className={`h-3 w-3 ${toneClass}`} strokeWidth={2} />

      <span className='text-xs font-medium text-muted-foreground'>{label}</span>

      <span className='text-xs font-mono text-foreground'>{has ? formatBytes(value) : '-'}</span>
    </Inline>
  );
}

export function TrafficCell({ id, rx, tx }: { id: number; rx?: number; tx?: number }) {
  const hasAny = (!!rx && rx > 0) || (!!tx && tx > 0);

  return (
    <Stack gap={1} className={hasAny ? '' : 'text-muted-foreground'}>
      <TrafficLine id={id} dir='rx' value={rx} />
      <TrafficLine id={id} dir='tx' value={tx} />
    </Stack>
  );
}

// ---------------- Dropdown actions ----------------
function ActionsDropdown({ row, open, onOpenChange }: { row: RemoteRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const qc = useQueryClient();
  return (
    <div className='flex justify-end'>
      <Dropdown
        align='end'
        open={open}
        onOpenChange={onOpenChange}
        trigger={
          <Button variant='ghost' size='icon-sm' className='rounded-md'>
            <Icon name='more' />
          </Button>
        }
        contentProps={{
          className: 'min-w-40 mt-2',
        }}
        items={[
          {
            label: 'Edit',
            type: 'item',
            onAction: () => {
              navigate(`/nodes/edit/${row.id}`);
            },
          },
          {
            label: row.enabled ? 'Disable' : 'Enable',
            type: 'item',
            onAction: async () => {
              const title = row.enabled ? 'Disable node?' : 'Enable node?';
              const description = row.enabled
                ? 'Disabling the node will stop all connections and exposed services. Are you sure you want to disable this node?'
                : 'Enabling the node will allow connections if the node is properly configured. Are you sure you want to enable this node?';

              const ok = await dialog.confirm({
                title: title,
                description: description,
                destructive: row.enabled ? true : false,
                confirmText: row.enabled ? 'Disable' : 'Enable',
                cancelText: 'Cancel',
                closeOnOverlayClick: false,
                closeOnEsc: true,
                size: 'sm',
              });

              if (ok) {
                await enableNode(row.id as number, row.enabled ? 'disable' : 'enable');
                invalidateResourceFamily(qc, '/api/nodes/');
                return;
              }
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Delete',
            type: 'item',
            variant: 'destructive',
            onAction: async () => {
              const ok = await dialog.confirm({
                title: `Delete node?`,
                description: `This action cannot be undone. All data associated with the node will be permanently deleted. Are you sure you want to delete the node ${row.name}?`,
                destructive: true,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                closeOnOverlayClick: false,
                closeOnEsc: true,
                size: 'sm',
              });

              if (ok) {
                try {
                  await deleteNode(row.id as number);
                  await invalidateResourceFamily(qc, '/api/nodes/');
                  toast.success(`Node ${row.name} deleted successfully`, { duration: 2500 });
                } catch (err: any) {
                  dialog.alert({
                    title: 'Error deleting node',
                    description: err?.message || 'An unexpected error occurred while deleting the node.',
                  });
                }
              }
            },
          },
        ]}
      />
    </div>
  );
}

// ---------------- Columns ----------------
const commonColumns: ColumnDef<RemoteRow>[] = [
  {
    label: '',
    key: 'status',
    width: '40px',
    render: ({ row }) => <ConnectionIndicator row={row} />,
  },
  {
    label: 'Name',
    key: 'name',
    render: ({ row }) => (
      <div className='min-w-0'>
        <div className='flex items-center gap-2'>
          <Text variant='body-sm' as='span' className='font-medium truncate text-foreground'>
            {row.name}
          </Text>

          {row.isGateway ? <StatusBadge status='info'>Gateway</StatusBadge> : <StatusBadge status='success'>Node</StatusBadge>}
        </div>

        <div className='mt-1 text-xs text-muted-foreground truncate'>
          Last handshake: {row.latestHandshakeTimestamp ? getLatestHS(row.latestHandshakeTimestamp) : '-'}
        </div>
      </div>
    ),
  },
  {
    label: 'Traffic',
    key: 'transferRx',
    className: 'text-right tabular-nums w-42 pr-10',
    render: ({ row }) => <TrafficCell id={row.id as number} rx={row.transferRx} tx={row.transferTx} />,
  },
];

export type RemotesTableProps = {
  limit?: number;
  live?: boolean;

  onAdd?: () => void;
  onRowClick?: (row: RemoteRow) => void;
};

export function RemotesTable({ limit = 10, live = true, onAdd }: RemotesTableProps) {
  const tableRef = React.useRef<DataTableRef<RemoteRow>>(null);
  const [openByRow, setOpenByRow] = React.useState<Record<string, boolean>>({});
  const [expandedRow, setExpandedRow] = React.useState<RemoteRow | null>(null);

  const [filters, setFilters] = React.useState<Filters>({ search: '', status: '', type: '' });

  const columns: ColumnDef<RemoteRow>[] = React.useMemo(
    () => [
      ...commonColumns,
      {
        label: '',
        key: 'id',
        className: 'w-px pr-5 relative',
        render: ({ row }) => {
          const k = String(row.id);
          const open = !!openByRow[k];
          return <ActionsDropdown row={row} open={open} onOpenChange={(v) => setOpenByRow((p) => ({ ...p, [k]: v }))} />;
        },
      },
    ],
    [openByRow],
  );

  return (
    <QueryDataTable<RemoteRow>
      ref={tableRef}
      columns={columns}
      filters={filters}
      limit={limit}
      live={live}
      endpoint={'/api/nodes'}
      dataStream={'/api/nodes/stream'}
      showPagination
      onAdd={onAdd}
      expandable
      empty={{
        title: 'No nodes yet',
        description: 'Create your first node to start exposing services from private networks.',
        action: 'Create node',
      }}
      onExpand={(row) => setExpandedRow(row)}
      rowClassName={(row) => cn(!row.enabled ? 'opacity-60' : '', openByRow[String(row.id)] ? 'bg-muted/30' : '')}
      renderExpandedRow={({ row }) => <NodeInfo row={row} />}
    />
  );
}
