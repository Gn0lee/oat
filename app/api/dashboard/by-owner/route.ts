import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getStockPrices } from "@/lib/api/stock-price";
import { createClient } from "@/lib/supabase/server";
import type {
  MemberSummary,
  OwnerAnalysisData,
  OwnerHoldings,
  StockHoldingWithReturn,
} from "@/types";

/**
 * GET /api/dashboard/by-owner
 * 소유자별 분석 데이터 조회
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
      const emptyData: OwnerAnalysisData = {
        summary: [],
        holdings: [],
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

    // 소유자별로 종목 그룹화
    const ownerMap = new Map<
      string,
      {
        name: string;
        stocks: StockHoldingWithReturn[];
        totalValue: number;
        totalInvested: number;
      }
    >();

    let totalValueSum = 0;

    for (const h of holdings) {
      const priceKey = `${h.market}:${h.ticker}`;
      const priceData = stockPrices[priceKey];
      const currentPrice = priceData?.price ?? null;

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

      const stock: StockHoldingWithReturn = {
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
          ownerName: h.owner.name,
        },
      };

      const ownerId = h.owner.id;
      const ownerName = h.owner.name;

      const existing = ownerMap.get(ownerId);
      if (existing) {
        existing.stocks.push(stock);
        existing.totalValue += currentValue;
        existing.totalInvested += investedAmountKRW;
      } else {
        ownerMap.set(ownerId, {
          name: ownerName,
          stocks: [stock],
          totalValue: currentValue,
          totalInvested: investedAmountKRW,
        });
      }
    }

    // 비중 계산 및 정렬
    for (const [, owner] of ownerMap) {
      for (const stock of owner.stocks) {
        stock.allocationPercent =
          owner.totalValue > 0
            ? (stock.currentValue / owner.totalValue) * 100
            : 0;
      }
      // 평가금액 내림차순 정렬
      owner.stocks.sort((a, b) => b.currentValue - a.currentValue);
    }

    // 소유자별 요약 생성
    const summary: MemberSummary[] = Array.from(ownerMap.entries()).map(
      ([memberId, { name, totalValue, totalInvested }]) => {
        const memberReturn = totalValue - totalInvested;
        const memberReturnRate =
          totalInvested > 0 ? (memberReturn / totalInvested) * 100 : 0;
        return {
          memberId,
          memberName: name,
          totalValue,
          totalInvested,
          totalReturn: memberReturn,
          returnRate: memberReturnRate,
          percentage:
            totalValueSum > 0 ? (totalValue / totalValueSum) * 100 : 0,
        };
      },
    );

    // 평가금액 내림차순 정렬
    summary.sort((a, b) => b.totalValue - a.totalValue);

    // 소유자별 보유 종목 생성
    const ownerHoldings: OwnerHoldings[] = Array.from(ownerMap.entries()).map(
      ([ownerId, { name, stocks }]) => ({
        ownerId,
        ownerName: name,
        stocks,
      }),
    );

    // summary 순서와 동일하게 정렬
    ownerHoldings.sort((a, b) => {
      const aIndex = summary.findIndex((s) => s.memberId === a.ownerId);
      const bIndex = summary.findIndex((s) => s.memberId === b.ownerId);
      return aIndex - bIndex;
    });

    const result: OwnerAnalysisData = {
      summary,
      holdings: ownerHoldings,
      exchangeRate,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Owner analysis error:", error);
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
