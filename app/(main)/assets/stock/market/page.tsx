import {
  MarketTrendSection,
  OverseasMarketTrendSection,
} from "@/components/assets/stock";
import { ScreenSection, SectionHeader } from "@/components/layout/screen";

export default function StockMarketPage() {
  return (
    <>
      <ScreenSection>
        <SectionHeader
          title="시장 동향"
          description="국내와 해외 시장 흐름을 따로 확인해요"
        />
      </ScreenSection>
      <MarketTrendSection />
      <OverseasMarketTrendSection />
    </>
  );
}
