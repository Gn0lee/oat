import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";
import { formatKst } from "@/lib/date";

interface NewStockTransactionAccountPageProps {
  searchParams: Promise<{
    accountId?: string;
  }>;
}

export default async function NewStockTransactionAccountPage({
  searchParams,
}: NewStockTransactionAccountPageProps) {
  const { accountId } = await searchParams;
  const today = formatKst(new Date(), "yyyy-MM-dd");

  return (
    <PageContainer maxWidth="narrow">
      <MultiTransactionFormWrapper
        defaultDate={today}
        defaultAccountId={accountId}
      />
    </PageContainer>
  );
}
