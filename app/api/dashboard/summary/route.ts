import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockPrices } from "@/lib/api/stock-price";
import { createClient } from "@/lib/supabase/server";
import type {
  AssetClassSummary,
  DashboardSummary,
  MemberSummary,
} from "@/types";

interface HoldingWithValue {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  totalInvested: number;
  market: "KR" | "US" | "OTHER";
  currency: "KRW" | "USD";
  assetType: string;
  ownerId: string;
  ownerName: string;
  currentPrice: number | null;
  currentValue: number;
  investedAmountKRW: number;
}

/**
 * GET /api/dashboard/summary
 * 대시보드 요약 데이터 조회
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
    const exchangeRate = exchangeRateResult?.rate ?? 1300; // 기본값 1300

    // 보유 현황 조회 (페이지네이션 없이 전체)
    const holdingsResult = await getHoldings(supabase, householdId, {
      pagination: { page: 1, pageSize: 1000 },
    });

    const holdings = holdingsResult.data;

    // 빈 holdings 처리
    if (holdings.length === 0) {
      const emptySummary: DashboardSummary = {
        totalValue: 0,
        totalInvested: 0,
        totalReturn: 0,
        returnRate: 0,
        byMember: [],
        byAssetClass: [],
      };
      return NextResponse.json({
        ...emptySummary,
        missingPriceCount: 0,
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

    // 각 종목별 현재가치 계산
    let missingPriceCount = 0;
    const holdingsWithValue: HoldingWithValue[] = holdings.map((h) => {
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

      return {
        ticker: h.ticker,
        name: h.name,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        totalInvested: h.totalInvested,
        market: h.market,
        currency: h.currency,
        assetType: h.assetType,
        ownerId: h.owner.id,
        ownerName: h.owner.name,
        currentPrice,
        currentValue,
        investedAmountKRW,
      };
    });

    // 총계 계산
    const totalValue = holdingsWithValue.reduce(
      (sum, h) => sum + h.currentValue,
      0,
    );
    const totalInvested = holdingsWithValue.reduce(
      (sum, h) => sum + h.investedAmountKRW,
      0,
    );
    const totalReturn = totalValue - totalInvested;
    const returnRate =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // 멤버별 집계
    const memberMap = new Map<string, { name: string; value: number }>();
    for (const h of holdingsWithValue) {
      const existing = memberMap.get(h.ownerId);
      if (existing) {
        existing.value += h.currentValue;
      } else {
        memberMap.set(h.ownerId, { name: h.ownerName, value: h.currentValue });
      }
    }

    const byMember: MemberSummary[] = Array.from(memberMap.entries()).map(
      ([memberId, { name, value }]) => ({
        memberId,
        memberName: name,
        totalValue: value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }),
    );

    // 자산군별 집계
    const assetClassMap = new Map<string, number>();
    for (const h of holdingsWithValue) {
      const existing = assetClassMap.get(h.assetType) ?? 0;
      assetClassMap.set(h.assetType, existing + h.currentValue);
    }

    const byAssetClass: AssetClassSummary[] = Array.from(
      assetClassMap.entries(),
    ).map(([assetClass, value]) => ({
      assetClass: assetClass as AssetClassSummary["assetClass"],
      totalValue: value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    const summary: DashboardSummary & {
      missingPriceCount: number;
      exchangeRate: number;
    } = {
      totalValue,
      totalInvested,
      totalReturn,
      returnRate,
      byMember,
      byAssetClass,
      missingPriceCount,
      exchangeRate,
    };

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Dashboard summary error:", error);
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
