import {
  MarketTrendSection,
  MyStockSection,
  OverseasMarketTrendSection,
  PortfolioNavSection,
} from "@/components/assets/stock";

export default function StockMainPage() {
  return (
    <>
      <PortfolioNavSection />
      <MyStockSection />
      <MarketTrendSection />
      <OverseasMarketTrendSection />
    </>
  );
}
