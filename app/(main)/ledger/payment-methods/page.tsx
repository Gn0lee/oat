import { Plus } from "lucide-react";
import Link from "next/link";
import { PaymentMethodList } from "@/components/accounts";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function PaymentMethodsPage() {
  return (
    <PageContainer maxWidth="medium">
      <div className="flex justify-end">
        <Button size="sm" asChild>
          <Link href="/ledger/payment-methods/new?returnUrl=/ledger/payment-methods">
            <Plus className="w-4 h-4 mr-1" />
            결제수단 추가
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <section>
          <PaymentMethodList />
        </section>
      </div>
    </PageContainer>
  );
}
