import React from 'react';

import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/foundations';
import { PageHeader } from '@/app/layouts/partials/page-header';
import { PageContent } from '@/app/layouts/partials/page-content';
import { NodeList, RemotesTableProps } from '@/modules/remotes/components/table/node-list';
import { Button } from '@/components/ui/button';
import { NodeFilters } from '@/modules/remotes/components/table/node-filters';

export default function NodesPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = React.useState<RemotesTableProps['filters']>({ search: '', status: '', type: '' });

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
          content={<NodeFilters filters={filters} onChange={setFilters} />}
        />
      }
    >
      <Container size='xl'>
        <NodeList filters={filters} />
      </Container>
    </PageContent>
  );
}
