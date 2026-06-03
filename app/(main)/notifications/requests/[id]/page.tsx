import { RecordChangeRequestDetailClient } from "@/components/notifications/RecordChangeRequestDetailClient";

interface RecordChangeRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordChangeRequestDetailPage({
  params,
}: RecordChangeRequestDetailPageProps) {
  const { id } = await params;

  return <RecordChangeRequestDetailClient requestId={id} />;
}
