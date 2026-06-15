import { PageContainer } from "@/components/layout";
import { TransactionDetailClient } from "@/components/transactions/TransactionDetailClient";
import { requireUser } from "@/lib/supabase/auth";

interface TransactionDetailPageProps {
  params: Promise<{
    transactionId: string;
  }>;
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  await requireUser();
  const { transactionId } = await params;

  return (
    <PageContainer maxWidth="medium">
      <TransactionDetailClient transactionId={transactionId} />
    </PageContainer>
  );
}
