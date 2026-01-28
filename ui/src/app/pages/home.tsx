import { PageHeader } from '../layouts/partials/page-header';
import { PageContent } from '../layouts/partials/page-content';
import { Container } from '@/components/foundations';

export default function HomeView() {
  return (
    <PageContent
      constrain={false}
      header={<PageHeader container='xl' title='Welcome to Wiredoor' description='Your simple ingress as a service solution and IAP' />}
    >
      <Container size='xl'>Content goes here.</Container>
    </PageContent>
  );
}
