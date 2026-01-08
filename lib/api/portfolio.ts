import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { getExchangeRateSafe } from "./exchange";
import { getHoldings } from "./holdings";
import { getStockPrices } from "./stock-price";

/**
 * 포트폴리오 요약 정보
 */
export interface PortfolioSummary {
  holdingCount: number;
  totalValue: number;
  totalInvested: number;
  returnRate: number;
}

/**
 * 포트폴리오 요약 조회
 * - holdings 데이터를 기반으로 총 평가금액, 총 투자금액, 수익률 계산
 * - USD 자산은 KRW로 환산
 */
export async function getPortfolioSummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<PortfolioSummary> {
  const holdingsResult = await getHoldings(supabase, householdId, {
    pagination: { page: 1, pageSize: 1000 },
  });

  const holdings = holdingsResult.data;

  if (holdings.length === 0) {
    return {
      holdingCount: 0,
      totalValue: 0,
      totalInvested: 0,
      returnRate: 0,
    };
  }

  // 환율 조회
  const exchangeRateResult = await getExchangeRateSafe(supabase, "USD", "KRW");
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
  let totalValueKRW = 0;
  let totalInvestedKRW = 0;

  for (const h of holdings) {
    const priceKey = `${h.market}:${h.ticker}`;
    const priceData = stockPrices[priceKey];
    const currentPrice = priceData?.price ?? h.avgPrice;

    const rawCurrentValue = h.quantity * currentPrice;
    const rawInvestedAmount = h.totalInvested;

    // USD → KRW 환산
    const isUSD = h.currency === "USD";
    totalValueKRW += isUSD ? rawCurrentValue * exchangeRate : rawCurrentValue;
    totalInvestedKRW += isUSD
      ? rawInvestedAmount * exchangeRate
      : rawInvestedAmount;
  }

  // 수익률 계산
  const returnRate =
    totalInvestedKRW > 0
      ? ((totalValueKRW - totalInvestedKRW) / totalInvestedKRW) * 100
      : 0;

  return {
    holdingCount: holdings.length,
    totalValue: totalValueKRW,
    totalInvested: totalInvestedKRW,
    returnRate,
  };
}
