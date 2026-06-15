import { PageContainer } from "@/components/layout";
import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerRecordsPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function LedgerRecordsPage({
  searchParams,
}: LedgerRecordsPageProps) {
  await requireUser();
  const { date } = await searchParams;
  const today = getKstToday();

  return (
    <PageContainer maxWidth="default">
      <LedgerRecordsClient initialDate={normalizeRecordDate(date, today)} />
    </PageContainer>
  );
}
