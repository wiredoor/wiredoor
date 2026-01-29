import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/foundations';
import { PageHeader } from '@/app/layouts/partials/page-header';
import { PageContent } from '@/app/layouts/partials/page-content';
import { RemotesTable } from '@/modules/remotes/components/remotes-list';
import { Button } from '@/components/ui/button';

export default function RemotesPage() {
  const navigate = useNavigate();

  function addNode() {
    navigate('/nodes/new');
  }

  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container='xl'
          title='Remote nodes'
          description='Securely connects private environments using managed remote agents and gateways, enabling encrypted traffic routing and controlled access to isolated services.'
          actions={<Button onClick={addNode}>Add Node</Button>}
        />
      }
    >
      <Container size='xl'>
        <RemotesTable />
      </Container>
    </PageContent>
  );
}
