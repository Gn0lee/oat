import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
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
  const today = new Date().toISOString().split("T")[0];

  return <LedgerRecordsClient initialDate={normalizeRecordDate(date, today)} />;
}
