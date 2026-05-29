import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";

interface NewStockTransactionAccountPageProps {
  searchParams: Promise<{
    accountId?: string;
  }>;
}

export default async function NewStockTransactionAccountPage({
  searchParams,
}: NewStockTransactionAccountPageProps) {
  const { accountId } = await searchParams;
  const today = new Date().toISOString().split("T")[0];

  return (
    <PageContainer maxWidth="narrow">
      <MultiTransactionFormWrapper
        defaultDate={today}
        defaultAccountId={accountId}
      />
    </PageContainer>
  );
}
