import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { Icon, Inline, Stack, Surface } from '@/components/foundations';
import { StatusBadge } from '@/components/compound/badges';
import { RemoteRow } from './remotes-list';
import { ConnectionIndicator } from './connection-indicator';

function Kvp({ label, value, monospace, copyValue }: { label: string; value: React.ReactNode; monospace?: boolean; copyValue?: string }) {
  return (
    <Stack gap={1} className='min-w-0'>
      <span className='text-xs text-muted-foreground'>{label}</span>

      <Inline className='items-center gap-2 min-w-0'>
        <span className={`text-sm font-medium truncate ${monospace ? 'font-mono' : ''}`}>{value}</span>
        {copyValue ? (
          <Button
            variant='ghost'
            size='icon-sm'
            className='h-7 w-7 rounded-full'
            onClick={() => navigator.clipboard.writeText(copyValue)}
            aria-label={`Copy ${label}`}
          >
            <Icon name='copy' className='h-4 w-4' />
          </Button>
        ) : null}
      </Inline>
    </Stack>
  );
}

function ServiceRow({ title, subtitle, enabled, right }: { title: string; subtitle: string; enabled: boolean; right?: React.ReactNode }) {
  return (
    <Surface radius='lg' elevation='sm' className={`p-3 ${enabled ? '' : 'opacity-70'}`}>
      <Inline className='items-start justify-between gap-3'>
        <Stack gap={0} className='min-w-0'>
          <span className='text-sm font-medium truncate'>{title}</span>
          <span className='text-xs text-muted-foreground truncate'>{subtitle}</span>
        </Stack>
        {right ?? null}
      </Inline>
    </Surface>
  );
}

export function NodeDetailsCard({
  row,
  loading,
  onEnableToggle,
  onResolveAlert,
}: {
  row: RemoteRow;
  loading?: boolean;

  onEnableToggle?: (next: boolean) => void;

  onResolveAlert?: (alertLabel: string) => void;
}) {
  return (
    <Surface elevation='sm' radius='xl' className='p-3 md:p-4'>
      {/* Details grid: Client / Network / Policy */}
      {loading ? (
        <Stack gap={3}>
          <Skeleton className='h-4 w-40' />
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        </Stack>
      ) : (
        <>
          <Stack gap={2}>
            <Inline className='items-center justify-between'>
              <span className='text-sm font-semibold'>Client & network</span>
              <ConnectionIndicator row={{ status: row.status, enabled: row.enabled }} />
            </Inline>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Kvp label='Client IP' value={row.clientIp ?? '-'} monospace copyValue={row.clientIp} />
              <Kvp label='Tunnel IP' value={row.address ?? '-'} monospace copyValue={row.address} />
              {row.isGateway ? (
                <Kvp label='Gateway subnets' value={row.gatewaySubnets?.length ? row.gatewaySubnets.join(', ') : '—'} monospace />
              ) : null}

              <Kvp label='MTU' value={row.mtu ?? '—'} />
              <Kvp label='Internet traffic' value={row.allowInternet ? 'Allowed' : 'Disabled'} />
            </div>
          </Stack>

          <Separator className='my-4' />

          {/* Session & security (timeline) */}
          <Stack gap={2}>
            <Inline className='items-center justify-between'>
              <span className='text-sm font-semibold'>Session</span>
              <span className='text-xs text-muted-foreground'>Session Lifetime: {row.sessionLifetime ?? '-'}</span>
              <span className='text-xs text-muted-foreground'>Last session: {row.lastSessionAt ?? '-'}</span>
            </Inline>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Kvp label='Session started' value={row.sessionStartedAt ?? '-'} />
              <Kvp label='Session ended' value={row.sessionEndedAt ?? '-'} />
              <Kvp label='Credentials rotation' value={row.lastCredentialsRotationAt ?? '-'} />
            </div>
          </Stack>
        </>
      )}

      <Separator className='my-4' />

      {/* Services */}
      <Stack gap={2}>
        <Inline className='items-center justify-between'>
          <span className='text-sm font-semibold'>Services</span>
          <span className='text-xs text-muted-foreground'>{`0 HTTP • 0 TCP/UDP`}</span>
        </Inline>

        <Tabs defaultValue='http'>
          <TabsList>
            <TabsTrigger value='http'>HTTP</TabsTrigger>
            <TabsTrigger value='tcp'>TCP/UDP</TabsTrigger>
          </TabsList>

          <TabsContent value='http' className='pt-3'>
            {loading ? (
              <Stack gap={2}>
                <Skeleton className='h-14 w-full' />
                <Skeleton className='h-14 w-full' />
              </Stack>
            ) : row.http?.length ? (
              <Stack gap={2}>
                {row.http.map((s) => (
                  <ServiceRow
                    key={s.id}
                    title={s.name}
                    subtitle={`${s.domain} → ${s.target}`}
                    enabled={s.enabled}
                    right={
                      <Inline className='items-center gap-2'>
                        {s.tls ? <StatusBadge status='info'>TLS {s.tls}</StatusBadge> : null}
                        {s.auth && s.auth !== 'none' ? <StatusBadge status='warning'>Auth {s.auth}</StatusBadge> : null}
                        <Button variant='ghost' size='icon-sm' className='rounded-full'>
                          <Icon name='more' className='h-4 w-4' />
                        </Button>
                      </Inline>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <span className='text-sm text-muted-foreground'>No HTTP services.</span>
            )}
          </TabsContent>

          <TabsContent value='tcp' className='pt-3'>
            {loading ? (
              <Stack gap={2}>
                <Skeleton className='h-14 w-full' />
                <Skeleton className='h-14 w-full' />
              </Stack>
            ) : row.tcp?.length ? (
              <Stack gap={2}>
                {row.tcp.map((s) => (
                  <ServiceRow
                    key={s.id}
                    title={s.name}
                    subtitle={`${s.proto.toUpperCase()} :${s.port} → ${s.target}`}
                    enabled={s.enabled}
                    right={
                      <Inline className='items-center gap-2'>
                        <StatusBadge status='info'>{s.proto.toUpperCase()}</StatusBadge>
                        <Button variant='ghost' size='icon-sm' className='rounded-full'>
                          <Icon name='more' className='h-4 w-4' />
                        </Button>
                      </Inline>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <span className='text-sm text-muted-foreground'>No TCP/UDP services.</span>
            )}
          </TabsContent>
        </Tabs>
      </Stack>
    </Surface>
  );
}
