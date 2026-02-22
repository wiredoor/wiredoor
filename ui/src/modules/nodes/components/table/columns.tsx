import { ColumnDef } from '@/components/compound/table/data-table';
import { StatusBadge } from '@/components/compound/badges';
import { NodeInfo } from '../../node-schemas';
import { ConnectionIndicator } from './connection-indicator';
import { Text } from '@/components/foundations';
import { getLatestHS } from '@/lib/format';
import { TrafficCell } from './traffic-cell';

export const nodeColumns: ColumnDef<NodeInfo>[] = [
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
  {
    label: 'CLI Version',
    key: 'cliVersion',
    className: 'text-center w-24',
    render: ({ row }) => (
      <Text variant='body-sm' as='span' className='text-muted-foreground'>
        {row.cliVersion || 'None'}
      </Text>
    ),
  },
];
