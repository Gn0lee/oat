import { AccountNewForm } from "@/components/accounts/AccountNewForm";
import { PageContainer, PageHeader } from "@/components/layout";

export default function NewAccountPage() {
  return (
    <PageContainer maxWidth="narrow">
      <PageHeader title="계좌 추가" backHref="/assets/accounts" />
      <AccountNewForm />
    </PageContainer>
  );
}
