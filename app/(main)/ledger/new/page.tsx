import { PageContainer } from "@/components/layout";
import { LedgerFunnel } from "@/components/ledger/funnel/LedgerFunnel";

export default function LedgerNewPage() {
  return (
    <PageContainer maxWidth="narrow">
      <LedgerFunnel />
    </PageContainer>
  );
}
