import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  getDomesticFluctuationRank,
  getDomesticVolumeRank,
} from "@/lib/kis/client";
import {
  DomesticExchangeCode,
  KIS_SIGN,
  type KISFluctuationRankOutput,
  type KISVolumeRankOutput,
} from "@/lib/kis/types";
import type { DomesticMarketTrendData, MarketTrendItem } from "@/types";

const exchangeParamSchema = z.enum(DomesticExchangeCode);

/**
 * 전일 대비 부호를 변환
 */
function parseChangeSign(sign: string): "up" | "down" | "flat" {
  if (sign === KIS_SIGN.LIMIT_UP || sign === KIS_SIGN.RISE) return "up";
  if (sign === KIS_SIGN.LIMIT_DOWN || sign === KIS_SIGN.FALL) return "down";
  return "flat";
}

/**
 * 거래량 순위 응답을 MarketTrendItem으로 변환
 */
function mapVolumeRank(item: KISVolumeRankOutput): MarketTrendItem {
  const changeSign = parseChangeSign(item.prdy_vrss_sign);
  const multiplier = changeSign === "down" ? -1 : 1;

  return {
    rank: Number.parseInt(item.data_rank, 10),
    ticker: item.mksc_shrn_iscd,
    name: item.hts_kor_isnm,
    price: Number.parseInt(item.stck_prpr, 10),
    change: multiplier * Math.abs(Number.parseInt(item.prdy_vrss, 10)),
    changeRate: multiplier * Math.abs(Number.parseFloat(item.prdy_ctrt)),
    changeSign,
    volume: Number.parseInt(item.acml_vol, 10),
  };
}

/**
 * 등락률 순위 응답을 MarketTrendItem으로 변환
 */
function mapFluctuationRank(item: KISFluctuationRankOutput): MarketTrendItem {
  const changeSign = parseChangeSign(item.prdy_vrss_sign);
  const multiplier = changeSign === "down" ? -1 : 1;

  return {
    rank: Number.parseInt(item.data_rank, 10),
    ticker: item.stck_shrn_iscd,
    name: item.hts_kor_isnm,
    price: Number.parseInt(item.stck_prpr, 10),
    change: multiplier * Math.abs(Number.parseInt(item.prdy_vrss, 10)),
    changeRate: multiplier * Math.abs(Number.parseFloat(item.prdy_ctrt)),
    changeSign,
    volume: Number.parseInt(item.acml_vol, 10),
  };
}

/**
 * 국내 시장 동향 조회
 * GET /api/market-trend/domestic?exchange=KRX
 *
 * 인증 불필요 (공개 데이터)
 * 1분 캐싱 (Cache-Control 헤더)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeParam = searchParams.get("exchange") || "KRX";

    // 거래소 파라미터 검증
    const parseResult = exchangeParamSchema.safeParse(exchangeParam);
    if (!parseResult.success) {
      return NextResponse.json(
        toErrorResponse(
          new APIError(
            "INVALID_EXCHANGE_PARAM",
            `유효하지 않은 거래소 파라미터입니다: ${exchangeParam}. KRX 또는 NXT만 허용됩니다.`,
            400,
          ),
        ),
        { status: 400 },
      );
    }

    const exchange = parseResult.data;

    // 병렬로 3개 API 호출
    const [volumeRank, gainers, losers] = await Promise.all([
      getDomesticVolumeRank(exchange, 5),
      getDomesticFluctuationRank(exchange, "up", 5),
      getDomesticFluctuationRank(exchange, "down", 5),
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
