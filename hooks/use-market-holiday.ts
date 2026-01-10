"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketHolidayResponse } from "@/app/api/market-holiday/kr/route";
import { queries } from "@/lib/queries/keys";

/**
 * 국내 시장 휴장일 API 호출
 */
async function fetchMarketHoliday(): Promise<MarketHolidayResponse> {
  const response = await fetch("/api/market-holiday/kr");

  if (!response.ok) {
    throw new Error("휴장일 조회 실패");
  }

  return response.json();
}

/**
 * 국내 시장 휴장일 조회 훅
 *
 * - 1시간 staleTime (휴장일은 자주 변경되지 않음)
 * - 에러 시 자동 갱신 중지 (retry: 1)
 */
export function useMarketHoliday() {
  return useQuery({
    queryKey: queries.marketTrend.holiday.queryKey,
    queryFn: fetchMarketHoliday,
    staleTime: 60 * 60 * 1000, // 1시간
    retry: 1,
  });
}
