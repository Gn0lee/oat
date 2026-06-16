import { PageContainer } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionDetailLoading() {
  return (
    <PageContainer maxWidth="medium">
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </PageContainer>
  );
}
