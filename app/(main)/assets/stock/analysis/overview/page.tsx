import {
  StockOverviewAccountDistributionSection,
  StockOverviewAccountSection,
  StockOverviewAllocationSection,
  StockOverviewMarketSection,
  StockOverviewSummarySection,
  StockOverviewTopPerformersSection,
} from "@/components/assets/stock/analysis/overview";

export default function StockOverviewAnalysisPage() {
  return (
    <>
      <StockOverviewSummarySection />
      <StockOverviewAllocationSection />
      <StockOverviewMarketSection />
      <StockOverviewAccountSection />
      <StockOverviewAccountDistributionSection />
      <StockOverviewTopPerformersSection />
    </>
  );
}
