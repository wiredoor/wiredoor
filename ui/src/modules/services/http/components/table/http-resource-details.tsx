import React from 'react';

import { Icon, Inline, Text } from '@/components/foundations';
import { HttpResourceInfo } from '../../http-resource-schemas';
import { StatusBadge } from '@/components/compound/badges';

export function HttpResourceDetails({ row }: { row: HttpResourceInfo }) {
  return (
    <div className='max-w-5xl space-y-4'>
      {/* Routing Rules */}
      {row.accessRules?.length && (
        <div>
          <h4 className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'>Routing Rules</h4>
          <div className='space-y-2'>
            {row.httpUpstreams?.map((rule, index) => (
              <Inline key={index} justify='between' className='px-3 py-2 bg-white border border-border rounded text-sm'>
                <Inline>
                  <Text variant='code'>{rule.pathPattern || '/'}</Text>
                  <Icon name='arrowRight' className='text-muted-foreground' />
                  <Text variant='code' className='text-muted-foreground'>
                    {rule.targetHost}:{rule.targetPort}
                  </Text>
                </Inline>
                {rule.targetNodeId ? (
                  <Inline>
                    <Text variant='body-sm' as='span' className='text-muted-foreground'>
                      {rule.node?.name}
                    </Text>
                    <Text variant='body-sm' as='span' className='text-muted-foreground'>
                      {rule.node?.isGateway ? <StatusBadge status='info'>Gateway</StatusBadge> : <StatusBadge status='success'>Node</StatusBadge>}
                    </Text>
                  </Inline>
                ) : (
                  <Text variant='body-sm' as='span' className='text-muted-foreground'>
                    Local
                  </Text>
                )}
              </Inline>
            ))}
          </div>
        </div>
      )}

      {/* Authentication Rules */}
      {row.accessRules?.length && (
        <div>
          <h4 className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2'>Authentication Rules</h4>
          <div className='space-y-2'>
            {row.accessRules.map((rule, index) => (
              <div key={index} className='flex items-center justify-between px-3 py-2 bg-white border border-border rounded text-sm'>
                <div className='flex items-center gap-3'>
                  <span className='font-mono text-foreground'>{rule.pattern}</span>
                  <span className='text-xs text-muted-foreground'>{rule.methods?.length ? rule.methods.join(', ') : 'All Methods'}</span>
                </div>
                <div className='flex items-center gap-2'>
                  {rule.action === 'public' ? (
                    <span className='flex items-center gap-1 text-xs text-status-idle'>
                      <Icon name='globe' className='w-3 h-3' />
                      Public
                    </span>
                  ) : (
                    <span className='flex items-center gap-1 text-xs text-primary'>
                      <Icon name='lock' className='w-3 h-3' />
                      {rule.action === 'deny' ? 'Deny' : 'Require Auth'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
