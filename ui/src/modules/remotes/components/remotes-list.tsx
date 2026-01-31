import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { type ColumnDef, type Id, DataTableRef } from '@/components/compound/table/data-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icon, Inline, Stack, Surface } from '@/components/foundations';
import { StatusBadge, StatusDot } from '@/components/compound/badges';

import { QueryDataTable } from '@/modules/shared/components/query-data-table';
import { formatBytes, getLatestHS } from '@/lib/format';
import { DataTableToolbar } from '@/modules/shared/components/data-table-toolbar';
import { SelectField, TextField } from '@/components/compound/form';
import { enableNode } from '../api/update-node';

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

  const label = dir === 'rx' ? 'Rx' : 'Tx';
  const arrowIcon = dir === 'rx' ? 'arrowDown' : 'arrowUp';

  const toneClass =
    has && pulse ? (dir === 'rx' ? 'text-emerald-600 dark:text-emerald-500' : 'text-sky-600 dark:text-sky-500') : 'text-muted-foreground';

  return (
    <Inline className={`items-center gap-2`}>
      <span className='inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted/40'>
        <Icon name={arrowIcon} className={`h-4 w-4 ${toneClass}`} />
      </span>

      <span className='text-xs font-medium text-muted-foreground'>{label}</span>

      <span className='text-sm tabular-nums text-foreground'>{has ? formatBytes(value) : '-'}</span>
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
  return (
    <div className='flex justify-end'>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon-sm' className='rounded-full'>
            <Icon name='more' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuItem
            onSelect={() => {
              navigate(`/nodes/edit/${row.id}`);
              onOpenChange(false);
            }}
          >
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              enableNode(row.id as number, row.enabled ? 'disable' : 'enable');
              onOpenChange(false);
            }}
          >
            {row.enabled ? 'Disable' : 'Enable'}
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------- Columns ----------------
const commonColumns: ColumnDef<RemoteRow>[] = [
  {
    label: '',
    key: 'status',
    width: '60px',
    render: ({ row }) => (
      <Inline justify='center' align='center'>
        {!row.enabled ? (
          <Icon name='link-off' className='h-4 w-4 text-muted-foreground' />
        ) : (
          <StatusDot size='sm' motion={row.status === 'online' ? 'ping' : 'blink'} tone={row.status === 'online' ? 'success' : 'destructive'} />
        )}
      </Inline>
    ),
  },
  {
    label: 'Name',
    key: 'name',
    render: ({ row }) => (
      <div className='min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='font-medium truncate hover:underline cursor-pointer underline-offset-4'>{row.name}</span>

          {row.isGateway ? <StatusBadge status='info'>Gateway</StatusBadge> : <StatusBadge status='success'>Node</StatusBadge>}
        </div>

        <div className='text-xs text-muted-foreground truncate'>
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
    <Surface className='p-3 md:p-4 space-y-2' elevation='sm' radius='xl'>
      <DataTableToolbar<Filters>
        defaultValues={{ search: '', status: '', type: '' }}
        debounceMs={350}
        onFiltersChange={setFilters}
        actions={
          <Button variant='outline' size='sm'>
            Columns
          </Button>
        }
      >
        {(form) => (
          <>
            <TextField form={form} name='search' placeholder='Search...' className='w-48' />
            <SelectField
              form={form}
              name='status'
              placeholder='Status'
              className='w-32'
              options={[
                { label: 'All', value: 'all' },
                { label: 'Online', value: 'online' },
                { label: 'Offline', value: 'offline' },
                { label: 'Iddle', value: 'iddle' },
              ]}
            />
            <SelectField
              form={form}
              name='type'
              className='w-32'
              placeholder='Type'
              options={[
                { label: 'All', value: 'all' },
                { label: 'Node', value: 'node' },
                { label: 'Gateway', value: 'gateway' },
              ]}
            />
          </>
        )}
      </DataTableToolbar>

      <div className='bg-card'>
        <div className='px-4 py-2 text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>1</span> node • <span className='font-medium text-foreground'>1</span> online • 0 offline
        </div>
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
          rowClassName={(row) => (!row.enabled ? 'opacity-60' : '')}
          renderExpandedRow={({ row }) => (
            <div className='rounded-md border p-3'>
              <div className='text-sm font-medium'>{row.name}</div>
              <div className='text-xs text-muted-foreground'>
                enabled: {String(row.enabled)} • gateway: {String(row.isGateway)}
              </div>
            </div>
          )}
        />
      </div>
    </Surface>
  );
}
