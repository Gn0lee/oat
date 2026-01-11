import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockPrices } from "@/lib/api/stock-price";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountBreakdown,
  CurrencyBreakdown,
  CurrencyType,
  MarketBreakdown,
  MarketType,
  StockAnalysisData,
  StockHoldingWithReturn,
} from "@/types";

/**
 * GET /api/dashboard/stocks
 * 주식 분석 데이터 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 사용자의 가구 조회
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    // 환율 조회 (USD → KRW)
    const exchangeRateResult = await getExchangeRateSafe(
      supabase,
      "USD",
      "KRW",
    );
    const exchangeRate = exchangeRateResult?.rate ?? 1300;

    // 보유 현황 조회 (페이지네이션 없이 전체)
    const holdingsResult = await getHoldings(supabase, householdId, {
      pagination: { page: 1, pageSize: 1000 },
    });

    const holdings = holdingsResult.data;

    // 빈 holdings 처리
    if (holdings.length === 0) {
      const emptyData: StockAnalysisData = {
        summary: {
          totalValue: 0,
          totalInvested: 0,
          totalReturn: 0,
          returnRate: 0,
          holdingCount: 0,
          missingPriceCount: 0,
        },
        holdings: [],
        byMarket: [],
        byCurrency: [],
        byAccount: [],
        exchangeRate,
      };
      return NextResponse.json(emptyData);
    }

    // 주가 조회
    const stockQueries = holdings
      .filter((h) => h.market === "KR" || h.market === "US")
      .map((h) => ({
        market: h.market as "KR" | "US",
        code: h.ticker,
      }));

    const stockPrices = await getStockPrices(supabase, stockQueries);

    // 각 종목별 현재가치 및 수익률 계산
    let missingPriceCount = 0;
    let totalValueSum = 0;
    let totalInvestedSum = 0;

    const holdingsWithReturn: StockHoldingWithReturn[] = holdings.map((h) => {
      const priceKey = `${h.market}:${h.ticker}`;
      const priceData = stockPrices[priceKey];
      const currentPrice = priceData?.price ?? null;

      if (currentPrice === null) {
        missingPriceCount++;
      }

      // 현재가가 없으면 평균 매수가를 대신 사용
      const effectivePrice = currentPrice ?? h.avgPrice;
      const rawCurrentValue = h.quantity * effectivePrice;
      const rawInvestedAmount = h.totalInvested;

      // USD → KRW 환산
      const isUSD = h.currency === "USD";
      const currentValue = isUSD
        ? rawCurrentValue * exchangeRate
        : rawCurrentValue;
      const investedAmountKRW = isUSD
        ? rawInvestedAmount * exchangeRate
        : rawInvestedAmount;

      // 수익 계산
      const returnAmount = currentValue - investedAmountKRW;
      const returnRate =
        investedAmountKRW > 0 ? (returnAmount / investedAmountKRW) * 100 : 0;

      totalValueSum += currentValue;
      totalInvestedSum += investedAmountKRW;

      return {
        ticker: h.ticker,
        name: h.name,
        market: h.market,
        currency: h.currency,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice,
        totalInvested: investedAmountKRW,
        currentValue,
        returnAmount,
        returnRate,
        allocationPercent: 0, // 나중에 계산
        account: {
          id: h.account.id,
          name: h.account.name,
          broker: h.account.broker,
        },
      };
    });

    // 비중 계산
    for (const holding of holdingsWithReturn) {
      holding.allocationPercent =
        totalValueSum > 0 ? (holding.currentValue / totalValueSum) * 100 : 0;
    }

    // 총 수익률 계산
    const totalReturn = totalValueSum - totalInvestedSum;
    const totalReturnRate =
      totalInvestedSum > 0 ? (totalReturn / totalInvestedSum) * 100 : 0;

    // 시장별 집계
    const marketMap = new Map<MarketType, number>();
    for (const h of holdingsWithReturn) {
      const existing = marketMap.get(h.market) ?? 0;
      marketMap.set(h.market, existing + h.currentValue);
    }

    const byMarket: MarketBreakdown[] = Array.from(marketMap.entries()).map(
      ([market, value]) => ({
        market,
        totalValue: value,
        percentage: totalValueSum > 0 ? (value / totalValueSum) * 100 : 0,
      }),
    );

    // 통화별 집계
    const currencyMap = new Map<CurrencyType, number>();
    for (const h of holdingsWithReturn) {
      const existing = currencyMap.get(h.currency) ?? 0;
      currencyMap.set(h.currency, existing + h.currentValue);
    }

    const byCurrency: CurrencyBreakdown[] = Array.from(
      currencyMap.entries(),
    ).map(([currency, value]) => ({
      currency,
      totalValue: value,
      percentage: totalValueSum > 0 ? (value / totalValueSum) * 100 : 0,
    }));

    // 계좌별 집계
    const accountMap = new Map<
      string | null,
      {
        accountName: string | null;
        broker: string | null;
        totalValue: number;
        totalInvested: number;
        holdingCount: number;
      }
    >();

    for (const h of holdingsWithReturn) {
      const accountId = h.account.id;
      const existing = accountMap.get(accountId);

      if (existing) {
        existing.totalValue += h.currentValue;
        existing.totalInvested += h.totalInvested;
        existing.holdingCount += 1;
      } else {
        accountMap.set(accountId, {
          accountName: h.account.name,
          broker: h.account.broker,
          totalValue: h.currentValue,
          totalInvested: h.totalInvested,
          holdingCount: 1,
        });
      }
    }

    const byAccount: AccountBreakdown[] = Array.from(accountMap.entries())
      .map(([accountId, data]) => {
        const returnAmount = data.totalValue - data.totalInvested;
        const returnRate =
          data.totalInvested > 0
            ? (returnAmount / data.totalInvested) * 100
            : 0;

        return {
          accountId,
          accountName: data.accountName,
          broker: data.broker,
          totalValue: data.totalValue,
          totalInvested: data.totalInvested,
          returnAmount,
          returnRate,
          percentage:
            totalValueSum > 0 ? (data.totalValue / totalValueSum) * 100 : 0,
          holdingCount: data.holdingCount,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue); // 평가금액 내림차순 정렬

    // 평가금액 내림차순 정렬
    holdingsWithReturn.sort((a, b) => b.currentValue - a.currentValue);

    const result: StockAnalysisData = {
      summary: {
        totalValue: totalValueSum,
        totalInvested: totalInvestedSum,
        totalReturn,
        returnRate: totalReturnRate,
        holdingCount: holdings.length,
        missingPriceCount,
      },
      holdings: holdingsWithReturn,
      byMarket,
      byCurrency,
      byAccount,
      exchangeRate,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Stock analysis error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
