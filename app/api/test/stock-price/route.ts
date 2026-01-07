/**
 * KIS API 가격 조회 테스트 엔드포인트
 *
 * GET /api/test/stock-price?codes=005930,000660,AAPL,TSLA
 *
 * - 국내 주식: 6자리 숫자 코드 (예: 005930)
 * - 해외 주식: 영문 티커 (예: AAPL)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getStockPrices } from "@/lib/api/stock-price";
import type { StockQuery } from "@/lib/kis/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const codesParam = request.nextUrl.searchParams.get("codes");

  if (!codesParam) {
    return NextResponse.json(
      { error: "codes 파라미터가 필요합니다. 예: ?codes=005930,AAPL" },
      { status: 400 },
    );
  }

  const codes = codesParam.split(",").map((c) => c.trim());

  // 종목 코드 분류 (6자리 숫자 = 국내, 그 외 = 해외)
  const stocks: StockQuery[] = codes.map((code) => ({
    market: /^\d{6}$/.test(code) ? "KR" : "US",
    code,
  }));

  const supabase = await createClient();

  try {
    // 가격 조회 전 DB 상태 확인 (캐시 히트/미스 판단용)
    const krCodes = stocks.filter((s) => s.market === "KR").map((s) => s.code);
    const usCodes = stocks.filter((s) => s.market === "US").map((s) => s.code);

    type CacheRow = { market: string; code: string; fetched_at: string };

    const fetchKrCache = async (): Promise<CacheRow[]> => {
      if (krCodes.length === 0) return [];
      const { data } = await supabase
        .from("stock_prices")
        .select("market, code, fetched_at")
        .eq("market", "KR")
        .in("code", krCodes);
      return (data ?? []) as CacheRow[];
    };

    const fetchUsCache = async (): Promise<CacheRow[]> => {
      if (usCodes.length === 0) return [];
      const { data } = await supabase
        .from("stock_prices")
        .select("market, code, fetched_at")
        .eq("market", "US")
        .in("code", usCodes);
      return (data ?? []) as CacheRow[];
    };

    const [krCache, usCache] = await Promise.all([
      fetchKrCache(),
      fetchUsCache(),
    ]);
    const beforeCache = [...krCache, ...usCache];

    const cacheStatus = new Map<string, string>();
    const now = Date.now();
    // 1시간 (stock-price.ts와 동일)
    const BUCKET_MS = 60 * 60 * 1000;
    const currentBucket = Math.floor(now / BUCKET_MS);

    for (const row of beforeCache) {
      const cacheBucket = Math.floor(
        new Date(row.fetched_at).getTime() / BUCKET_MS,
      );
      const key = `${row.market}:${row.code}`;
      cacheStatus.set(key, cacheBucket === currentBucket ? "HIT" : "EXPIRED");
    }

    // 가격 조회
    const prices = await getStockPrices(supabase, stocks);

    const elapsedTime = Date.now() - startTime;

    // 결과 정리
    const results = Object.entries(prices).map(([key, data]) => ({
      key,
      market: data.market,
      code: data.code,
      price: data.price,
      changeRate: data.changeRate,
      fetchedAt: data.fetchedAt.toISOString(),
      cacheStatus: cacheStatus.get(key) ?? "MISS",
    }));

    // 통계
    const stats = {
      total: stocks.length,
      cacheHit: results.filter((r) => r.cacheStatus === "HIT").length,
      cacheMiss: results.filter((r) => r.cacheStatus === "MISS").length,
      cacheExpired: results.filter((r) => r.cacheStatus === "EXPIRED").length,
      elapsedMs: elapsedTime,
    };

    return NextResponse.json({
      success: true,
      stats,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
