import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Container, Icon } from '@/components/foundations';
import { PageHeader } from '@/app/layouts/partials/page-header';
import { PageContent } from '@/app/layouts/partials/page-content';

export default function FormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const title = isEdit ? 'Edit HTTP Service' : 'Create HTTP Service';
  const description = isEdit
    ? 'Update this HTTP service configuration.'
    : 'Securely expose HTTP services with custom domains, routing rules, and access control.';

  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container='xl'
          title={title}
          description={description}
          actions={
            <Button variant='ghost' size='icon' onClick={() => navigate('/services/http')}>
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
