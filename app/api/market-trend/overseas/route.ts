import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  getOverseasPriceFluct,
  getOverseasVolumeSurge,
} from "@/lib/kis/client";
import {
  KIS_SIGN,
  type KISOverseasPriceFluctOutput,
  type KISOverseasVolumeSurgeOutput,
} from "@/lib/kis/types";
import type { MarketTrendItem, OverseasMarketTrendData } from "@/types";

const exchangeParamSchema = z.enum(["NAS", "NYS", "AMS"]);
const timeRangeParamSchema = z.enum([
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

/**
 * 해외주식 대비 부호를 변환
 */
function parseChangeSign(sign: string): "up" | "down" | "flat" {
  if (sign === KIS_SIGN.LIMIT_UP || sign === KIS_SIGN.RISE) return "up";
  if (sign === KIS_SIGN.LIMIT_DOWN || sign === KIS_SIGN.FALL) return "down";
  return "flat";
}

/**
 * 가격급등락 응답을 MarketTrendItem으로 변환
 */
function mapPriceFluct(
  item: KISOverseasPriceFluctOutput,
  rank: number,
): MarketTrendItem {
  const changeSign = parseChangeSign(item.sign);
  const multiplier = changeSign === "down" ? -1 : 1;

  return {
    rank,
    ticker: item.symb,
    name: item.knam || item.enam,
    price: Number.parseFloat(item.last),
    // 방어적 정규화: API 부호 정보를 최우선하여 수치 강제 조정
    change: multiplier * Math.abs(Number.parseFloat(item.diff)),
    changeRate: multiplier * Math.abs(Number.parseFloat(item.rate)),
    changeSign,
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
  const changeSign = parseChangeSign(item.sign);
  const multiplier = changeSign === "down" ? -1 : 1;

  return {
    rank,
    ticker: item.symb,
    name: item.knam || item.enam,
    price: Number.parseFloat(item.last),
    change: multiplier * Math.abs(Number.parseFloat(item.diff)),
    changeRate: multiplier * Math.abs(Number.parseFloat(item.rate)),
    changeSign,
    volume: Number.parseInt(item.tvol, 10),
  };
}

/**
 * 해외주식 시장 동향 조회
 * GET /api/market-trend/overseas?exchange=NAS&timeRange=0
 *
 * 인증 불필요 (공개 데이터)
 * 1분 캐싱 (Cache-Control 헤더)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeParam = searchParams.get("exchange") || "NAS";
    const timeRangeParam = searchParams.get("timeRange") || "0";

    // 거래소 파라미터 검증
    const exchangeParseResult = exchangeParamSchema.safeParse(exchangeParam);
    if (!exchangeParseResult.success) {
      return NextResponse.json(
        toErrorResponse(
          new APIError(
            "INVALID_EXCHANGE_PARAM",
            `유효하지 않은 거래소 파라미터입니다: ${exchangeParam}. NAS, NYS, AMS만 허용됩니다.`,
            400,
          ),
        ),
        { status: 400 },
      );
    }

    // 시간 범위 파라미터 검증
    const timeRangeParseResult = timeRangeParamSchema.safeParse(timeRangeParam);
    if (!timeRangeParseResult.success) {
      return NextResponse.json(
        toErrorResponse(
          new APIError(
            "INVALID_TIME_RANGE_PARAM",
            `유효하지 않은 시간 범위 파라미터입니다: ${timeRangeParam}. 0~9만 허용됩니다.`,
            400,
          ),
        ),
        { status: 400 },
      );
    }

    const exchange = exchangeParseResult.data;
    const timeRange = timeRangeParseResult.data;

    // 병렬로 3개 API 호출
    const [volumeSurge, gainers, losers] = await Promise.all([
      getOverseasVolumeSurge(exchange, timeRange, 5),
      getOverseasPriceFluct(exchange, "up", timeRange, 5),
      getOverseasPriceFluct(exchange, "down", timeRange, 5),
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
