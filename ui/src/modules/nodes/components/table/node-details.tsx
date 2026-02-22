import React from 'react';

import { Icon, Inline, Stack, Text } from '@/components/foundations';
import { formatBytes, humanDate } from '@/lib/format';
import { Link } from '@/components/foundations/link';
import { NodeInfo } from '../../node-schemas';
import { listNodeHttpServices } from '../../api/list-node-http-services';
import { listNodeTcpServices } from '../../api/list-node-tcp-services';

export function NodeDetails({ row }: { row: NodeInfo }) {
  const id = Number(row.id);

  const [tcpServices, setTcpServices] = React.useState<any[]>([]);
  const [httpServices, setHttpServices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  void error;

  const load = React.useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const [httpRes, tcpRes] = await Promise.all([listNodeHttpServices(id), listNodeTcpServices(id)]);
      setHttpServices(httpRes);
      setTcpServices(tcpRes);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message ?? 'Error loading node details');
      setTcpServices([]);
      setHttpServices([]);
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className='mx-2 lg:mx-8 grid lg:grid-cols-2 gap-6'>
      {/* Node Info */}
      <Stack gap={3}>
        <Inline gap={2} align='center' className='h-9'>
          <Icon name='server' className='w-4 h-4 text-muted-foreground' />
          <Text variant='body-sm' as='h4' className='font-medium text-foreground'>
            Node Info
          </Text>
        </Inline>
        <Stack gap={2} className='divide-y divide-border divide-border/60'>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Client IP
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.clientIp || '-'}
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Type
            </Text>
            <Text variant='body-sm' className='text-foreground'>
              {row.isGateway ? 'Gateway' : 'Node'}
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Uptime
            </Text>
            <Text variant='body-sm' className='text-foreground'>
              {!row.disconnectedAt && row.connectedAt ? humanDate(row.connectedAt) : '-'}
            </Text>
          </Inline>
        </Stack>
      </Stack>

      {/* Network Details */}
      <Stack gap={3}>
        <Inline gap={2} align='center' className='h-9'>
          <Icon name='network' className='w-4 h-4 text-muted-foreground' />
          <Text variant='body-sm' as='h4' className='font-medium text-foreground'>
            Network
          </Text>
        </Inline>
        <Stack gap={2} className='divide-y divide-border divide-border/60'>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Protocol
            </Text>
            <Text variant='body-sm' className='text-foreground'>
              WireGuard
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Tunnel IP
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.address || '-'}
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Traffic Received from Node (RX)
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.transferRx ? formatBytes(row.transferRx) : '-'}
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Traffic Transmitted to Node (TX)
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.transferTx ? formatBytes(row.transferTx) : '-'}
            </Text>
          </Inline>
        </Stack>
      </Stack>
      {/* Services */}
      <Stack gap={3}>
        <Inline gap={2} align='center' className='h-9'>
          <Icon name='globe' className='w-4 h-4 text-muted-foreground' />
          <Text variant='body-sm' as='h4' className='font-medium text-foreground'>
            HTTP Services
          </Text>
        </Inline>
        <Stack gap={2} className='divide-y divide-border divide-border/60'>
          {!loading && httpServices && httpServices.length > 0 ? (
            httpServices.map((service, idx) => (
              <Inline key={idx} justify='between'>
                <Link href={service.publicAccess || '#'} onClick={(e) => e.preventDefault()}>
                  {service.name}
                </Link>
                <Text variant='body-sm' className='font-mono text-foreground'>
                  :{service.backendPort}
                </Text>
              </Inline>
            ))
          ) : (
            <>
              {/* <LoaderOverlay loading={loading} /> */}
              <Text variant='body-sm' align='center' className='text-muted-foreground'>
                No HTTP services configured
              </Text>
              {row.status === 'online' && (
                <Inline justify='center'>
                  <Link href='#' className='text-xs' onClick={(e) => e.preventDefault()}>
                    Add HTTP Service
                  </Link>
                </Inline>
              )}
            </>
          )}
        </Stack>
      </Stack>
      <Stack gap={3}>
        <Inline gap={2} align='center' className='h-9'>
          <Icon name='boxes' className='w-4 h-4 text-muted-foreground' />
          <Text variant='body-sm' as='h4' className='font-medium text-foreground'>
            TCP/UDP Services
          </Text>
        </Inline>
        <Stack gap={2} className='divide-y divide-border divide-border/60'>
          {!loading && tcpServices && tcpServices.length > 0 ? (
            tcpServices.map((service, idx) => (
              <Inline key={idx} justify='between'>
                <Link href={service.publicAccess || '#'} onClick={(e) => e.preventDefault()}>
                  {service.name}
                </Link>
                <Text variant='body-sm' className='font-mono text-foreground'>
                  :{service.backendPort}
                </Text>
              </Inline>
            ))
          ) : (
            <>
              {/* <LoaderOverlay loading={loading} /> */}
              <Text variant='body-sm' align='center' className='text-muted-foreground'>
                No TCP/UDP services configured
              </Text>
              {row.status === 'online' && (
                <Inline justify='center'>
                  <Link href='#' className='text-xs' onClick={(e) => e.preventDefault()}>
                    Add TCP/UDP Service
                  </Link>
                </Inline>
              )}
            </>
          )}
        </Stack>
      </Stack>
    </div>
  );
}
