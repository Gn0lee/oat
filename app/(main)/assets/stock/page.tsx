import { StockSummarySection } from "@/components/dashboard/stocks";
import { PageHeader } from "@/components/layout";

export default function StockMainPage() {
  return (
    <>
      <PageHeader title="주식" backHref="/assets" />
      <StockSummarySection />
    </>
  );
}
