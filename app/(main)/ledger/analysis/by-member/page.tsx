import { PageContainer } from "@/components/layout";
import { ByMemberClient } from "@/components/ledger/analysis/ByMemberClient";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";

export default function ByMemberPage() {
  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <ByMemberClient />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
