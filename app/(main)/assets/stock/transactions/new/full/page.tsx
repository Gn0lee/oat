import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";

export default function NewStockTransactionFullPage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <PageContainer maxWidth="narrow">
      <MultiTransactionFormWrapper defaultDate={today} />
    </PageContainer>
  );
}
