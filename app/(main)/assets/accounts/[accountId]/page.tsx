import { BalanceDetailClient } from "@/components/accounts/BalanceDetailClient";
import { PageContainer } from "@/components/layout";

interface AccountDetailPageProps {
  params: Promise<{
    accountId: string;
  }>;
}

export default async function AccountDetailPage({
  params,
}: AccountDetailPageProps) {
  const { accountId } = await params;

  return (
    <PageContainer maxWidth="medium">
      <BalanceDetailClient kind="account" id={accountId} />
    </PageContainer>
  );
}
