import { PageContainer } from "@/components/layout";
import { TransactionFunnel } from "@/components/transactions/funnel";

export default function NewTransactionPage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <PageContainer maxWidth="narrow">
      <TransactionFunnel defaultDate={today} />
    </PageContainer>
  );
}
