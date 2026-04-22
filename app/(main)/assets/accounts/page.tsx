import { Plus } from "lucide-react";
import Link from "next/link";
import { AccountList, PaymentMethodList } from "@/components/accounts";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="계좌 / 결제수단"
        backHref="/assets"
        action={
          <Link href="/assets/accounts/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              계좌 추가
            </Button>
          </Link>
        }
      />

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-3">자산 계좌</h2>
          <AccountList />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">결제수단</h2>
          <PaymentMethodList />
        </section>
      </div>
    </PageContainer>
  );
}
