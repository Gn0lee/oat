import { BalanceDetailClient } from "@/components/accounts/BalanceDetailClient";
import { PageContainer } from "@/components/layout";

interface PaymentMethodDetailPageProps {
  params: Promise<{
    paymentMethodId: string;
  }>;
}

export default async function PaymentMethodDetailPage({
  params,
}: PaymentMethodDetailPageProps) {
  const { paymentMethodId } = await params;

  return (
    <PageContainer maxWidth="medium">
      <BalanceDetailClient kind="payment_method" id={paymentMethodId} />
    </PageContainer>
  );
}
