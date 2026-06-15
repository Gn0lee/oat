import { PageContainer } from "@/components/layout";
import { LedgerEntryDetailClient } from "@/components/ledger/records/LedgerEntryDetailClient";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerEntryDetailPageProps {
  params: Promise<{
    entryId: string;
  }>;
}

export default async function LedgerEntryDetailPage({
  params,
}: LedgerEntryDetailPageProps) {
  await requireUser();
  const { entryId } = await params;

  return (
    <PageContainer maxWidth="medium">
      <LedgerEntryDetailClient entryId={entryId} />
    </PageContainer>
  );
}
