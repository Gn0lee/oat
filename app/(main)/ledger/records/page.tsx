import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { requireUser } from "@/lib/supabase/auth";

export default async function LedgerRecordsPage() {
  await requireUser();
  return <LedgerRecordsClient />;
}
