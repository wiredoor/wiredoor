import { ColumnDef } from '@/components/compound/table/data-table';
import { Icon, Inline, Text } from '@/components/foundations';
import { HttpResourceInfo } from '../../http-resource-schemas';
import { StatusBadge } from '@/components/compound/badges';

export const httpResourceColumns: ColumnDef<HttpResourceInfo>[] = [
  {
    label: 'Name',
    key: 'name',
    render: ({ row }) => (
      <div className='min-w-0'>
        <div className='flex items-center gap-2'>
          <Text variant='body-sm' as='span' className='font-medium truncate text-foreground'>
            {row.name}
          </Text>
        </div>
      </div>
    ),
  },
  {
    label: 'Domain',
    key: 'domain',
    render: ({ row }) => (
      <div className='min-w-0'>
        <div className='flex items-center gap-2'>
          <Text variant='code' as='span' className='font-medium truncate text-foreground'>
            {row.domain}
          </Text>
        </div>
      </div>
    ),
  },
  {
    label: 'Target',
    key: 'httpUpstreams',
    render: ({ row }) => {
      const rootTarget = row.httpUpstreams?.filter((u) => u.pathPattern === '/')[0] ?? row.httpUpstreams?.[0];

      return rootTarget ? (
        rootTarget.targetNodeId ? (
          <Inline>
            <Text variant='body-sm' as='span' className='text-muted-foreground'>
              {rootTarget.node?.isGateway ? <StatusBadge status='info'>Gateway</StatusBadge> : <StatusBadge status='success'>Node</StatusBadge>}
            </Text>
            <Text variant='body-sm' as='span' className='text-muted-foreground'>
              {rootTarget.node?.name}
            </Text>
          </Inline>
        ) : (
          <Text variant='body-sm' as='span' className='text-muted-foreground'>
            Local
          </Text>
        )
      ) : (
        <Text variant='body-sm' as='span' className='text-muted-foreground'>
          None
        </Text>
      );
    },
  },
  {
    label: 'Security',
    key: 'security',
    className: 'text-center w-24',
    render: ({ row }) => {
      const authEnabled = row.oidcProviderId && row.accessRules?.some((r) => r.action === 'require_auth');
      // const rateLimitEnabled = row.edgeRules?.some((r) => r.action === 'deny');
      // const firewallEnabled = row.edgeRules?.some((r) => r.action === 'deny');

      return (
        <Inline justify='center'>
          {authEnabled ? (
            <div className='group relative' title='Authentication enabled'>
              <Icon name='lock' className='w-4 h-4 text-primary' />
            </div>
          ) : (
            <div className='group relative' title='Public access'>
              <Icon name='globe' className='w-4 h-4 text-muted-foreground' />
            </div>
          )}
          {/* {firewallEnabled && (
            <div className='group relative' title='WAF enabled'>
              <Icon name='disconnect' className='w-4 h-4 text-primary' />
            </div>
          )}
          {rateLimitEnabled && (
            <div className='group relative' title='Rate limiting enabled'>
              <Icon name='zap' className='w-4 h-4 text-primary' />
            </div>
          )} */}
        </Inline>
      );
    },
  },
];
