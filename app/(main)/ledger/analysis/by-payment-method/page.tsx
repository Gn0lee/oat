import { PageContainer } from "@/components/layout";
import { ByPaymentMethodClient } from "@/components/ledger/analysis/ByPaymentMethodClient";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";

export default function ByPaymentMethodPage() {
  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <ByPaymentMethodClient />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
