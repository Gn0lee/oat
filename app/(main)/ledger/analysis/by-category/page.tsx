import { PageContainer } from "@/components/layout";
import { ByCategoryClient } from "@/components/ledger/analysis/ByCategoryClient";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";

export default function ByCategoryPage() {
  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <ByCategoryClient />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
