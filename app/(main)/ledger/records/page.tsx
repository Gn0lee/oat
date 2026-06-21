import { PageContainer } from "@/components/layout";
import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerRecordsPageProps {
  searchParams: Promise<{
    date?: string;
    scope?: string;
    categoryId?: string;
    childCategoryId?: string;
    categoryBreakdown?: string;
  }>;
}

export default async function LedgerRecordsPage({
  searchParams,
}: LedgerRecordsPageProps) {
  await requireUser();
  const { date, scope } = await searchParams;
  const today = getKstToday();
  const initialScope = scope === "personal" ? "personal" : "shared";

  return (
    <PageContainer maxWidth="default">
      <LedgerRecordsClient
        initialDate={normalizeRecordDate(date, today)}
        initialScope={initialScope}
      />
    </PageContainer>
  );
}
