import { PageContainer } from "@/components/layout";
import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { resolveLedgerRecordsInitialDate } from "@/lib/api/ledger-record-date";
import { getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

interface LedgerRecordsPageProps {
  searchParams: Promise<{
    date?: string;
    book?: string;
  }>;
}

export default async function LedgerRecordsPage({
  searchParams,
}: LedgerRecordsPageProps) {
  const user = await requireUser();
  const { date, book } = await searchParams;
  const today = getKstToday();
  let initialDate = normalizeRecordDate(date, today);
  if (!date) {
    const supabase = await createClient();
    const householdId = await getUserHouseholdId(supabase, user.id);
    if (householdId) {
      initialDate = await resolveLedgerRecordsInitialDate(
        supabase,
        householdId,
        { bookId: book, today },
      );
    }
  }

  return (
    <PageContainer maxWidth="medium">
      <LedgerRecordsClient initialDate={initialDate} />
    </PageContainer>
  );
}
