import { ColumnDef } from '@/components/compound/table/data-table';
import { StatusDot, StatusBadge } from '@/components/compound/badges';
import { NodeRow } from './types';

export const commonColumns: ColumnDef<NodeRow>[] = [
  {
    label: '',
    key: 'status',
    width: '60px',
    render: ({ row }) => (
      <StatusDot size='xs' motion={row.status === 'online' ? 'ping' : 'blink'} tone={row.status === 'online' ? 'success' : 'destructive'} />
    ),
  },
  {
    label: 'Name',
    key: 'name',
    render: ({ row }) => (
      <a className='text-blue-600 hover:underline' href='#'>
        {row.name}
      </a>
    ),
  },
  {
    label: 'Type',
    key: 'isGateway',
    render: ({ row }) => (row.isGateway ? <StatusBadge status='info'>Gateway</StatusBadge> : <StatusBadge status='success'>Node</StatusBadge>),
  },
  {
    label: 'Latest Handshake',
    key: 'latestHandshakeTimestamp',
    render: ({ value }) => new Date(value).toLocaleTimeString(),
  },
  {
    label: 'Received (KB)',
    key: 'transferRx',
    render: ({ value }) => Math.round(value / 1024),
  },
  {
    label: 'Transmitted (KB)',
    key: 'transferTx',
    render: ({ value }) => Math.round(value / 1024),
  },
];
