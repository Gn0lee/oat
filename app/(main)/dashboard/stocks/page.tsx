import {
  AccountBreakdownSection,
  MarketBreakdownSection,
  StockAccountDistributionSection,
  StockAllocationSection,
  StockSummarySection,
  TopPerformersSection,
} from "@/components/dashboard/stocks";
import { PageHeader } from "@/components/layout";

export default function StocksAnalysisPage() {
  return (
    <>
      <PageHeader
        title="주식 분석"
        subtitle="종목별 비중과 수익률"
        backHref="/dashboard"
      />
      <StockSummarySection />
      <StockAllocationSection />
      <MarketBreakdownSection />
      <AccountBreakdownSection />
      <StockAccountDistributionSection />
      <TopPerformersSection />
    </>
  );
}
