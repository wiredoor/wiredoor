import { Container } from "@/components/foundations";
import { PageHeader } from "@/app/layouts/partials/page-header";
import { PageContent } from "@/app/layouts/partials/page-content";

export default function RemotesPage() {
  return (
    <PageContent
      constrain={false}
      header={
        <PageHeader
          container="xl"
          title="Remote nodes"
          description="Securely connects private environments using managed remote agents and gateways, enabling encrypted traffic routing and controlled access to isolated services."
        />
      }
    >
      <Container size="xl">Content goes here.</Container>
    </PageContent>
  );
}
