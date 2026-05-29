import { Suspense } from "react";
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
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        }
      >
        <LedgerEntryComposer mode="daily" defaultDate={getDefaultDate(date)} />
      </Suspense>
    </PageContainer>
  );
}
