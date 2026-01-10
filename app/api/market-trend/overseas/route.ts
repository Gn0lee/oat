import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  getOverseasPriceFluct,
  getOverseasVolumeSurge,
} from "@/lib/kis/client";
import type {
  KISOverseasPriceFluctOutput,
  KISOverseasVolumeSurgeOutput,
} from "@/lib/kis/types";
import type { MarketTrendItem, OverseasMarketTrendData } from "@/types";

/**
 * 해외주식 대비 부호를 변환
 */
function parseChangeSign(sign: string): "up" | "down" | "flat" {
  // 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
  if (sign === "1" || sign === "2") return "up";
  if (sign === "4" || sign === "5") return "down";
  return "flat";
}

/**
 * 가격급등락 응답을 MarketTrendItem으로 변환
 */
function mapPriceFluct(
  item: KISOverseasPriceFluctOutput,
  rank: number,
): MarketTrendItem {
  return {
    rank,
    ticker: item.symb,
    name: item.knam || item.enam,
    price: Number.parseFloat(item.last),
    change: Number.parseFloat(item.diff),
    changeRate: Number.parseFloat(item.rate),
    changeSign: parseChangeSign(item.sign),
    volume: Number.parseInt(item.tvol, 10),
  };
}

/**
 * 거래량급증 응답을 MarketTrendItem으로 변환
 */
function mapVolumeSurge(
  item: KISOverseasVolumeSurgeOutput,
  rank: number,
): MarketTrendItem {
  return {
    rank,
    ticker: item.symb,
    name: item.knam || item.enam,
    price: Number.parseFloat(item.last),
    change: Number.parseFloat(item.diff),
    changeRate: Number.parseFloat(item.rate),
    changeSign: parseChangeSign(item.sign),
    volume: Number.parseInt(item.tvol, 10),
  };
}

/**
 * 해외주식 시장 동향 조회
 * GET /api/market-trend/overseas
 *
 * 인증 불필요 (공개 데이터)
 * 1분 캐싱 (Cache-Control 헤더)
 */
export async function GET() {
  try {
    // 병렬로 3개 API 호출 (NASDAQ 기준)
    const [volumeSurge, gainers, losers] = await Promise.all([
      getOverseasVolumeSurge("NAS", 5),
      getOverseasPriceFluct("NAS", "up", 5),
      getOverseasPriceFluct("NAS", "down", 5),
    ]);

    const result: OverseasMarketTrendData = {
      volumeSurge: volumeSurge.map((item, idx) =>
        mapVolumeSurge(item, idx + 1),
      ),
      gainers: gainers.map((item, idx) => mapPriceFluct(item, idx + 1)),
      losers: losers.map((item, idx) => mapPriceFluct(item, idx + 1)),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("해외주식 시장 동향 조회 실패:", error);

    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    return NextResponse.json(
      toErrorResponse(
        new APIError(
          "OVERSEAS_MARKET_TREND_ERROR",
          "해외주식 시장 동향 조회에 실패했습니다.",
          500,
        ),
      ),
      { status: 500 },
    );
  }
}
