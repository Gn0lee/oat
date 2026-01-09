import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockPrices } from "@/lib/api/stock-price";
import { createClient } from "@/lib/supabase/server";
import type {
  MarketType,
  RiskHoldingItem,
  RiskLevel,
  RiskLevelSummary,
} from "@/types";

interface HoldingWithValue {
  ticker: string;
  name: string;
  market: MarketType;
  quantity: number;
  riskLevel: RiskLevel | null;
  currentValue: number;
  totalInvested: number;
  returnAmount: number;
  returnRate: number;
}

/**
 * GET /api/dashboard/by-risk
 * 위험도별 자산 분석 데이터 조회
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
      return NextResponse.json({
        totalValue: 0,
        byRiskLevel: [],
        exchangeRate,
      });
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
    const holdingsWithValue: HoldingWithValue[] = holdings.map((h) => {
      const priceKey = `${h.market}:${h.ticker}`;
      const priceData = stockPrices[priceKey];
      const currentPrice = priceData?.price ?? null;

      // 현재가가 없으면 평균 매수가를 대신 사용
      const effectivePrice = currentPrice ?? h.avgPrice;
      const rawCurrentValue = h.quantity * effectivePrice;
      const rawTotalInvested = h.totalInvested;

      // USD → KRW 환산
      const isUSD = h.currency === "USD";
      const currentValue = isUSD
        ? rawCurrentValue * exchangeRate
        : rawCurrentValue;
      const totalInvested = isUSD
        ? rawTotalInvested * exchangeRate
        : rawTotalInvested;

      // 수익률 계산
      const returnAmount = currentValue - totalInvested;
      const returnRate =
        totalInvested > 0 ? (returnAmount / totalInvested) * 100 : 0;

      return {
        ticker: h.ticker,
        name: h.name,
        market: h.market,
        quantity: h.quantity,
        riskLevel: h.riskLevel,
        currentValue,
        totalInvested,
        returnAmount,
        returnRate,
      };
    });

    // 총 자산 계산
    const totalValue = holdingsWithValue.reduce(
      (sum, h) => sum + h.currentValue,
      0,
    );

    // 위험도별 집계 (금액 + 종목 리스트)
    const riskLevelMap = new Map<
      RiskLevel | null,
      { totalValue: number; holdings: RiskHoldingItem[] }
    >();
    for (const h of holdingsWithValue) {
      const existing = riskLevelMap.get(h.riskLevel) ?? {
        totalValue: 0,
        holdings: [],
      };
      existing.totalValue += h.currentValue;
      existing.holdings.push({
        ticker: h.ticker,
        name: h.name,
        market: h.market,
        quantity: h.quantity,
        currentValue: h.currentValue,
        totalInvested: h.totalInvested,
        returnAmount: h.returnAmount,
        returnRate: h.returnRate,
      });
      riskLevelMap.set(h.riskLevel, existing);
    }

    const byRiskLevel: RiskLevelSummary[] = Array.from(
      riskLevelMap.entries(),
    ).map(([riskLevel, { totalValue: value, holdings }]) => ({
      riskLevel,
      totalValue: value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
    }));

    return NextResponse.json({
      totalValue,
      byRiskLevel,
      exchangeRate,
    });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("By risk analysis error:", error);
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
