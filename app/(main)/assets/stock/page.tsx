import {
  MarketTrendSection,
  MyStockSection,
  OverseasMarketTrendSection,
  PortfolioNavSection,
} from "@/components/assets/stock";
import { PageHeader } from "@/components/layout";

export default function StockMainPage() {
  return (
    <>
      <PageHeader title="주식" backHref="/assets" />
      <div className="mt-6">
        <PortfolioNavSection />
      </div>
      <div className="mt-6">
        <MyStockSection />
      </div>
      <div className="mt-6">
        <MarketTrendSection />
      </div>
      <div className="mt-6">
        <OverseasMarketTrendSection />
      </div>
    </>
  );
}
