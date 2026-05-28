import {
  AccountBreakdownSection,
  MarketBreakdownSection,
  StockAccountDistributionSection,
  StockAllocationSection,
  StockSummarySection,
  TopPerformersSection,
} from "@/components/dashboard/stocks";

export default function StocksAnalysisPage() {
  return (
    <>
      <StockSummarySection />
      <StockAllocationSection />
      <MarketBreakdownSection />
      <AccountBreakdownSection />
      <StockAccountDistributionSection />
      <TopPerformersSection />
    </>
  );
}
