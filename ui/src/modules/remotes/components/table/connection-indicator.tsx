import { Icon, Inline } from '@/components/foundations';
import { StatusDot } from '@/components/compound/badges';

export function ConnectionIndicator({ row }: { row: { status: 'online' | 'offline' | 'iddle'; enabled: boolean } }) {
  return (
    <Inline justify='center' align='center'>
      {!row.enabled ? (
        <Icon name='link-off' className='h-4 w-4 text-muted-foreground' />
      ) : (
        <StatusDot size='sm' motion={row.status === 'online' ? 'ping' : 'blink'} tone={row.status === 'online' ? 'success' : 'destructive'} />
      )}
    </Inline>
  );
}
