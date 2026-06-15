import { MyStockSection, PortfolioNavSection } from "@/components/assets/stock";
import { PageContainer } from "@/components/layout";

export default function StockMainPage() {
  return (
    <PageContainer maxWidth="default">
      <MyStockSection />
      <PortfolioNavSection />
    </PageContainer>
  );
}
