import { StockRecordsClient } from "@/components/transactions/records/StockRecordsClient";
import { getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";

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

  return (
    <StockRecordsClient
      currentUserId={user.id}
      initialDate={normalizeRecordDate(date, today)}
    />
  );
}
