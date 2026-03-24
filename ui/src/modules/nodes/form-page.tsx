import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Container, Icon } from '@/components/foundations';
import { PageHeader } from '@/layouts/partials/page-header';
import { PageContent } from '@/layouts/partials/page-content';
import { NodeForm } from '@/modules/nodes/components/form/node-form';

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
        <NodeForm nodeId={id} />
      </Container>
    </PageContent>
  );
}
