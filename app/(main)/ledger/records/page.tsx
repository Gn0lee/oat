import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { formatKst } from "@/lib/date";
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
  const today = formatKst(new Date(), "yyyy-MM-dd");

  return <LedgerRecordsClient initialDate={normalizeRecordDate(date, today)} />;
}
