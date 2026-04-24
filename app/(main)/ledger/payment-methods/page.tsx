import { Plus } from "lucide-react";
import Link from "next/link";
import { PaymentMethodList } from "@/components/accounts";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function PaymentMethodsPage() {
  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="결제수단 관리"
        backHref="/ledger"
        action={
          <Link href="/ledger/payment-methods/new?returnUrl=/ledger/payment-methods">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              결제수단 추가
            </Button>
          </Link>
        }
      />

      <div className="space-y-8">
        <section>
          <PaymentMethodList />
        </section>
      </div>
    </PageContainer>
  );
}
