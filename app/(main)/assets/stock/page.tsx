import {
  MarketTrendSection,
  MyStockSection,
  PortfolioNavSection,
} from "@/components/assets/stock";
import { StockSummarySection } from "@/components/dashboard/stocks";
import { PageHeader } from "@/components/layout";

export default function StockMainPage() {
  return (
    <>
      <PageHeader title="주식" backHref="/assets" />
      <StockSummarySection />
      <div className="mt-6">
        <MyStockSection />
      </div>
      <div className="mt-6">
        <MarketTrendSection />
      </div>
      <div className="mt-6">
        <PortfolioNavSection />
      </div>
    </>
  );
}
