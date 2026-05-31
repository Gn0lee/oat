import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { LedgerEntryComposer } from "@/components/ledger/entry-composer/LedgerEntryComposer";
import { formatKst, getKstToday } from "@/lib/date";

export default function FullLedgerEntryPage() {
  const today = getKstToday();

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
        <LedgerEntryComposer mode="full" defaultDate={today} />
      </Suspense>
    </PageContainer>
  );
}
