import { PageContainer } from "@/components/layout";
import { ByMemberClient } from "@/components/ledger/analysis/ByMemberClient";

export default function ByMemberPage() {
  return (
    <PageContainer maxWidth="default">
      <ByMemberClient />
    </PageContainer>
  );
}
