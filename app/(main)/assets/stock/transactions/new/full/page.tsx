import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";
import { formatKst } from "@/lib/date";

export default function NewStockTransactionFullPage() {
  const today = formatKst(new Date(), "yyyy-MM-dd");

  return (
    <PageContainer maxWidth="narrow">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        }
      >
        <MultiTransactionFormWrapper defaultDate={today} />
      </Suspense>
    </PageContainer>
  );
}
