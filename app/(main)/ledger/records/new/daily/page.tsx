import { PageContainer } from "@/components/layout";
import { LedgerEntryComposer } from "@/components/ledger/entry-composer/LedgerEntryComposer";

interface DailyLedgerEntryPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

function getDefaultDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return new Date().toISOString().split("T")[0];
}

export default async function DailyLedgerEntryPage({
  searchParams,
}: DailyLedgerEntryPageProps) {
  const { date } = await searchParams;

  return (
    <PageContainer maxWidth="narrow">
      <LedgerEntryComposer mode="daily" defaultDate={getDefaultDate(date)} />
    </PageContainer>
  );
}
