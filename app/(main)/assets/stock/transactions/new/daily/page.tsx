import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";
import { normalizeRecordDate } from "@/lib/stock-records/records";

interface NewDailyStockTransactionPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function NewDailyStockTransactionPage({
  searchParams,
}: NewDailyStockTransactionPageProps) {
  const { date } = await searchParams;
  const today = new Date().toISOString().split("T")[0];

  return (
    <PageContainer maxWidth="narrow">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        }
      >
        <MultiTransactionFormWrapper
          mode="daily"
          defaultDate={normalizeRecordDate(date, today)}
        />
      </Suspense>
    </PageContainer>
  );
}
