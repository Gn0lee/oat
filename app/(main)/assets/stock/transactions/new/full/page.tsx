import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";

export default function NewStockTransactionFullPage() {
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
        <MultiTransactionFormWrapper />
      </Suspense>
    </PageContainer>
  );
}
