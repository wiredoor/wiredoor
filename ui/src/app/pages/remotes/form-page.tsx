import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Container, Stack, Surface, Inline, Icon } from '@/components/foundations';
import { PageHeader } from '@/app/layouts/partials/page-header';
import { PageContent } from '@/app/layouts/partials/page-content';
import { RemoteForm } from '@/modules/remotes/components/node-form';

export default function FormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const title = isEdit ? 'Edit Remote Node' : 'Create Remote Node';
  const description = isEdit
    ? 'Update this remote node configuration.'
    : 'Remote nodes allow you to securely connect private environments using managed remote agents and gateways, enabling encrypted traffic routing and controlled access to isolated services.';

  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container='xl'
          title={title}
          description={description}
          actions={
            <Button variant='ghost' size='icon' onClick={() => navigate('/nodes')}>
              <Icon name='close' />
            </Button>
          }
        />
      }
    >
      <Container size='xl'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
          <div className='lg:col-span-8'>
            <RemoteForm nodeId={id} />
          </div>

          <div className='lg:col-span-4'>
            <Stack gap={4} className='lg:sticky lg:top-6'>
              <Surface elevation='sm' radius='md' className='p-5'>
                <Stack gap={3}>
                  <Inline gap={2} align='center'>
                    <Icon name='info' className='text-muted-foreground' />
                    <div className='text-sm font-medium'>What you’re creating</div>
                  </Inline>

                  <div className='text-sm text-muted-foreground'>
                    A remote node runs an agent that joins your Wiredoor network and can optionally route traffic.
                  </div>

                  <div className='text-sm'>
                    <div className='font-medium'>Recommended defaults</div>
                    <ul className='mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1'>
                      <li>Name: something identifiable (env/region)</li>
                      <li>Gateway mode: only if you need subnet routing</li>
                      <li>Internet routing: enable only if you want full-tunnel</li>
                    </ul>
                  </div>
                </Stack>
              </Surface>

              <Surface elevation='sm' radius='md' className='p-5'>
                <Stack gap={2}>
                  <div className='text-sm font-medium'>Tips</div>
                  <ul className='list-disc pl-5 text-sm text-muted-foreground space-y-1'>
                    <li>Subnets must be in CIDR format (e.g. 10.0.0.0/24).</li>
                    <li>Use Advanced only if you know MTU/Keepalive requirements.</li>
                    <li>You can edit and fine-tune settings later.</li>
                  </ul>
                </Stack>
              </Surface>

              <Surface elevation='sm' radius='md' className='p-5'>
                <Stack gap={2}>
                  <div className='text-sm font-medium'>Need help?</div>
                  <div className='text-sm text-muted-foreground'>
                    If you’re unsure about gateway subnets, start without it and enable later after verifying routes.
                  </div>
                </Stack>
              </Surface>
            </Stack>
          </div>
        </div>
      </Container>
    </PageContent>
  );
}
