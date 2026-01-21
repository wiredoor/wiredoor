import { Container } from "@/components/foundations";
import { PageHeader } from "@/app/layouts/partials/page-header";
import { PageContent } from "@/app/layouts/partials/page-content";

export default function HttpServicesPage() {
  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container="xl"
          title="HTTP Services"
          description="Provides domain-based HTTP routing with automated TLS termination, access control, and flexible upstream routing for services running across private and public environments."
        />
      }
    >
      <Container size="xl">Content goes here.</Container>
    </PageContent>
  );
}
