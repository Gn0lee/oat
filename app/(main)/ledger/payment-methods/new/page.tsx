import { PaymentMethodNewForm } from "@/components/accounts/PaymentMethodNewForm";
import { PageContainer, PageHeader } from "@/components/layout";

export default function NewPaymentMethodPage() {
  return (
    <PageContainer maxWidth="narrow">
      <PageHeader title="결제수단 추가" backHref="/ledger/payment-methods" />
      <PaymentMethodNewForm />
    </PageContainer>
  );
}
