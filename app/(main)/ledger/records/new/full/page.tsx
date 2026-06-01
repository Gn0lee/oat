import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { LedgerEntryComposer } from "@/components/ledger/entry-composer/LedgerEntryComposer";

export default function FullLedgerEntryPage() {
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
        <LedgerEntryComposer mode="full" />
      </Suspense>
    </PageContainer>
  );
}
