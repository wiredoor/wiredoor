import React from 'react';

import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/foundations';
import { PageHeader } from '@/layouts/partials/page-header';
import { PageContent } from '@/layouts/partials/page-content';
import { Button } from '@/components/ui/button';
import { HttpResourceList } from '@/modules/services/http/components/table/http-resource-list';
import { HttpResourceFilterProps, HttpResourceFilters } from '@/modules/services/http/components/table/http-resource-filters';

export default function NodesPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = React.useState<HttpResourceFilterProps['filters']>({ search: '' });

  function addService() {
    navigate('/services/http/new');
  }

  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container='xl'
          title='HTTP Services'
          description='Provides domain-based HTTP routing with automated TLS termination, access control, and flexible upstream routing for services running across private and public environments.'
          actions={
            <Button testId='add-service' onClick={addService}>
              Add Service
            </Button>
          }
          content={<HttpResourceFilters filters={filters} onChange={setFilters} />}
        />
      }
    >
      <Container size='xl'>
        <HttpResourceList filters={filters} onAdd={addService} />
      </Container>
    </PageContent>
  );
}
