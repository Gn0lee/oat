import { PageContainer } from "@/components/layout";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";
import { TrendClient } from "@/components/ledger/analysis/TrendClient";

export default function TrendPage() {
  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <TrendClient />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
