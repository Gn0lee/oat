import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  getDomesticFluctuationRank,
  getDomesticVolumeRank,
} from "@/lib/kis/client";
import type {
  KISFluctuationRankOutput,
  KISVolumeRankOutput,
} from "@/lib/kis/types";
import type { DomesticMarketTrendData, MarketTrendItem } from "@/types";

/**
 * 전일 대비 부호를 변환
 */
function parseChangeSign(sign: string): "up" | "down" | "flat" {
  // 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
  if (sign === "1" || sign === "2") return "up";
  if (sign === "4" || sign === "5") return "down";
  return "flat";
}

/**
 * 거래량 순위 응답을 MarketTrendItem으로 변환
 */
function mapVolumeRank(item: KISVolumeRankOutput): MarketTrendItem {
  return {
    rank: Number.parseInt(item.data_rank, 10),
    ticker: item.mksc_shrn_iscd,
    name: item.hts_kor_isnm,
    price: Number.parseInt(item.stck_prpr, 10),
    change: Number.parseInt(item.prdy_vrss, 10),
    changeRate: Number.parseFloat(item.prdy_ctrt),
    changeSign: parseChangeSign(item.prdy_vrss_sign),
    volume: Number.parseInt(item.acml_vol, 10),
  };
}

/**
 * 등락률 순위 응답을 MarketTrendItem으로 변환
 */
function mapFluctuationRank(item: KISFluctuationRankOutput): MarketTrendItem {
  return {
    rank: Number.parseInt(item.data_rank, 10),
    ticker: item.stck_shrn_iscd,
    name: item.hts_kor_isnm,
    price: Number.parseInt(item.stck_prpr, 10),
    change: Number.parseInt(item.prdy_vrss, 10),
    changeRate: Number.parseFloat(item.prdy_ctrt),
    changeSign: parseChangeSign(item.prdy_vrss_sign),
    volume: Number.parseInt(item.acml_vol, 10),
  };
}

/**
 * 국내 시장 동향 조회
 * GET /api/market-trend/domestic
 *
 * 인증 불필요 (공개 데이터)
 * 1분 캐싱 (Cache-Control 헤더)
 */
export async function GET() {
  try {
    // 병렬로 3개 API 호출
    const [volumeRank, gainers, losers] = await Promise.all([
      getDomesticVolumeRank("KOSPI", 5),
      getDomesticFluctuationRank("KOSPI", "up", 5),
      getDomesticFluctuationRank("KOSPI", "down", 5),
    ]);

    const result: DomesticMarketTrendData = {
      volumeRank: volumeRank.map(mapVolumeRank),
      gainers: gainers.map(mapFluctuationRank),
      losers: losers.map(mapFluctuationRank),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("시장 동향 조회 실패:", error);

    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    return NextResponse.json(
      toErrorResponse(
        new APIError(
          "MARKET_TREND_ERROR",
          "시장 동향 조회에 실패했습니다.",
          500,
        ),
      ),
      { status: 500 },
    );
  }
}
