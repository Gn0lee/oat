import { AssetTypeCard } from "@/components/assets";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockPrices } from "@/lib/api/stock-price";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";

export default async function AssetsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 가구 ID 조회
  const householdId = await getUserHouseholdId(supabase, user.id);

  // 기본값
  let holdingCount = 0;
  let totalValue = 0;
  let totalInvested = 0;
  let returnRate = 0;

  if (householdId) {
    // 보유 현황 조회
    const holdingsResult = await getHoldings(supabase, householdId, {
      pagination: { page: 1, pageSize: 1000 },
    });

    const holdings = holdingsResult.data;
    holdingCount = holdings.length;

    if (holdings.length > 0) {
      // 환율 조회
      const exchangeRateResult = await getExchangeRateSafe(
        supabase,
        "USD",
        "KRW",
      );
      const exchangeRate = exchangeRateResult?.rate ?? 1300;

      // 주가 조회
      const stockQueries = holdings
        .filter((h) => h.market === "KR" || h.market === "US")
        .map((h) => ({
          market: h.market as "KR" | "US",
          code: h.ticker,
        }));

      const stockPrices = await getStockPrices(supabase, stockQueries);

      // 각 종목별 현재가치 계산
      for (const h of holdings) {
        const priceKey = `${h.market}:${h.ticker}`;
        const priceData = stockPrices[priceKey];
        const currentPrice = priceData?.price ?? h.avgPrice;

        const rawCurrentValue = h.quantity * currentPrice;
        const rawInvestedAmount = h.totalInvested;

        // USD → KRW 환산
        const isUSD = h.currency === "USD";
        totalValue += isUSD ? rawCurrentValue * exchangeRate : rawCurrentValue;
        totalInvested += isUSD
          ? rawInvestedAmount * exchangeRate
          : rawInvestedAmount;
      }

      // 수익률 계산
      if (totalInvested > 0) {
        returnRate = ((totalValue - totalInvested) / totalInvested) * 100;
      }
    }
  }

  return (
    <>
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 자산</h1>
      </div>

      {/* 총 자산 요약 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <span className="text-sm text-gray-500">총 자산</span>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {formatCurrency(totalValue)}
        </p>
      </div>

      {/* 자산 유형별 카드 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">자산 유형</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 주식/ETF - 활성 */}
          <AssetTypeCard
            type="stock"
            holdingCount={holdingCount}
            totalValue={totalValue}
            returnRate={returnRate}
          />

          {/* 현금/예적금 - 준비 중 */}
          <AssetTypeCard type="cash" disabled />

          {/* 부동산 - 준비 중 */}
          <AssetTypeCard type="real-estate" disabled />

          {/* 기타 - 준비 중 */}
          <AssetTypeCard type="other" disabled />
        </div>
      </div>
    </>
  );
}
