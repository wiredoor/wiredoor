import { Container } from '@/components/foundations';
import { PageHeader } from '@/layouts/partials/page-header';
import { PageContent } from '@/layouts/partials/page-content';

export default function TcpServicesPage() {
  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container='xl'
          title='Network Services (TCP/UDP)'
          description='Provides port-based TCP and UDP traffic routing with encrypted transport, access controls, and flexible upstream targeting for services running across private and public environments.'
        />
      }
    >
      <Container size='xl'>Content goes here.</Container>
    </PageContent>
  );
}
