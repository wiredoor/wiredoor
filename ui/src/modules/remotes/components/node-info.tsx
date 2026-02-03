import { Icon, Inline, Stack, Text } from '@/components/foundations';
import { RemoteRow } from './remotes-list';
import { formatBytes } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Link } from '../../../components/foundations/link';

export function NodeInfo({ row }: { row: RemoteRow }) {
  return (
    <div className='ml-8 grid md:grid-cols-3 gap-6'>
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
              {row.uptime || '-'}
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
              Traffic Received from Node
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.transferRx ? formatBytes(row.transferRx) : '-'}
            </Text>
          </Inline>
          <Inline justify='between'>
            <Text variant='body-sm' className='text-muted-foreground'>
              Traffic Transmitted to Node
            </Text>
            <Text variant='body-sm' className='font-mono text-foreground'>
              {row.transferTx ? formatBytes(row.transferTx) : '-'}
            </Text>
          </Inline>
        </Stack>
      </Stack>
      {/* Services */}
      <Tabs defaultValue='http'>
        <Stack gap={3}>
          <Inline justify='between'>
            <Inline gap={2} align='center' className='h-6'>
              <Icon name='activity' className='w-4 h-4 text-muted-foreground' />
              <Text variant='body-sm' as='h4' className='font-medium text-foreground'>
                Services
              </Text>
            </Inline>
            <TabsList>
              <TabsTrigger className='text-xs' value='http'>
                HTTP
              </TabsTrigger>
              <TabsTrigger className='text-xs' value='tcp'>
                TCP/UDP
              </TabsTrigger>
            </TabsList>
          </Inline>
          <TabsContent value='http'>
            <Stack gap={2} className='divide-y divide-border divide-border/60'>
              {row.httpServices && row.httpServices.length > 0 ? (
                row.httpServices.map((service, idx) => (
                  <Inline key={idx} justify='between'>
                    <Link href={service.url || '#'} onClick={(e) => e.preventDefault()}>
                      {service.name}
                    </Link>
                    <Text variant='body-sm' className='font-mono text-foreground'>
                      :{service.port}
                    </Text>
                  </Inline>
                ))
              ) : (
                <>
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
          </TabsContent>
          <TabsContent value='tcp'>
            <Stack gap={2} className='divide-y divide-border divide-border/60'>
              {row.tcpServices && row.tcpServices.length > 0 ? (
                row.tcpServices.map((service, idx) => (
                  <Inline key={idx} justify='between'>
                    <Link href={service.url || '#'} onClick={(e) => e.preventDefault()}>
                      {service.name}
                    </Link>
                    <Text variant='body-sm' className='font-mono text-foreground'>
                      :{service.port}
                    </Text>
                  </Inline>
                ))
              ) : (
                <>
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
          </TabsContent>
        </Stack>
      </Tabs>
    </div>
  );
}
