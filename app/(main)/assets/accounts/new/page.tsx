import { AccountNewForm } from "@/components/accounts/AccountNewForm";
import { PageContainer } from "@/components/layout";

export default function NewAccountPage() {
  return (
    <PageContainer maxWidth="narrow">
      <AccountNewForm />
    </PageContainer>
  );
}
