import { PaymentMethodNewForm } from "@/components/accounts/PaymentMethodNewForm";
import { PageContainer } from "@/components/layout";

export default function NewPaymentMethodPage() {
  return (
    <PageContainer maxWidth="narrow">
      <PaymentMethodNewForm />
    </PageContainer>
  );
}
