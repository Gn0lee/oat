import { PageContainer } from "@/components/layout";
import { RecordChangeRequestDetailClient } from "@/components/notifications/RecordChangeRequestDetailClient";

interface RecordChangeRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordChangeRequestDetailPage({
  params,
}: RecordChangeRequestDetailPageProps) {
  const { id } = await params;

  return (
    <PageContainer maxWidth="medium">
      <RecordChangeRequestDetailClient requestId={id} />
    </PageContainer>
  );
}
