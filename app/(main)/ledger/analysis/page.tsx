import { PageContainer } from "@/components/layout";
import { LedgerAnalysisHub } from "@/components/ledger/analysis/LedgerAnalysisHub";
import { LedgerAnalysisScope } from "@/components/ledger/analysis/LedgerAnalysisScope";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function LedgerAnalysisPage() {
  await requireUser();

  return (
    <PageContainer maxWidth="default">
      <LedgerAnalysisScope>
        <LedgerAnalysisHub />
      </LedgerAnalysisScope>
    </PageContainer>
  );
}
