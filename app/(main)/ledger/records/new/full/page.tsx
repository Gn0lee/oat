import { PageContainer } from "@/components/layout";
import { LedgerEntryComposer } from "@/components/ledger/entry-composer/LedgerEntryComposer";

export default function FullLedgerEntryPage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <PageContainer maxWidth="narrow">
      <LedgerEntryComposer mode="full" defaultDate={today} />
    </PageContainer>
  );
}
