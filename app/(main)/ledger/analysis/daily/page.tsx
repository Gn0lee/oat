import { PageContainer } from "@/components/layout";
import { DailyClient } from "@/components/ledger/analysis/DailyClient";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";

export default function DailyPage() {
  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <DailyClient />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
