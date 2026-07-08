import { PageContainer } from "@/components/layout";
import { StockRecordsClient } from "@/components/transactions/records/StockRecordsClient";
import { markNotificationsAsReadForLinkBestEffort } from "@/lib/api/notifications";
import { getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

interface StockRecordsPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function StockRecordsPage({
  searchParams,
}: StockRecordsPageProps) {
  const user = await requireUser();
  const { date } = await searchParams;
  const today = getKstToday();
  const initialDate = normalizeRecordDate(date, today);
  const supabase = await createClient();

  await markNotificationsAsReadForLinkBestEffort(supabase, user.id, {
    kind: "stock_record_date",
    params: { date: initialDate },
  });

  return (
    <PageContainer maxWidth="default">
      <StockRecordsClient initialDate={initialDate} />
    </PageContainer>
  );
}
