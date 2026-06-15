import {
  StockOverviewAccountDistributionSection,
  StockOverviewAccountSection,
  StockOverviewAllocationSection,
  StockOverviewMarketSection,
  StockOverviewSummarySection,
  StockOverviewTopPerformersSection,
} from "@/components/assets/stock/analysis/overview";
import { PageContainer } from "@/components/layout";

export default function StockOverviewAnalysisPage() {
  return (
    <PageContainer maxWidth="default">
      <StockOverviewSummarySection />
      <StockOverviewAllocationSection />
      <StockOverviewMarketSection />
      <StockOverviewAccountSection />
      <StockOverviewAccountDistributionSection />
      <StockOverviewTopPerformersSection />
    </PageContainer>
  );
}
