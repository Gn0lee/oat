"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { DomesticMarketTrendData } from "@/types";

interface MarketTrendError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchDomesticMarketTrend(): Promise<DomesticMarketTrendData> {
  const response = await fetch("/api/market-trend/domestic");
  const json = await response.json();

  if (!response.ok) {
    const error = json as MarketTrendError;
    throw new Error(error.error.message);
  }

  return json as DomesticMarketTrendData;
}

/**
 * 국내 시장 동향 조회 훅
 * - 1분마다 자동 갱신
 * - 에러 발생 시 자동 갱신 중지
 * - 30초 staleTime
 */
export function useDomesticMarketTrend() {
  return useQuery({
    queryKey: queries.marketTrend.domestic.queryKey,
    queryFn: fetchDomesticMarketTrend,
    staleTime: 30 * 1000, // 30초
    retry: 2, // 최대 2회 재시도 (총 3회 시도)
    refetchInterval: (query) => {
      // 에러 상태이거나 실패 횟수가 3회 이상이면 자동 갱신 중지
      if (
        query.state.status === "error" ||
        query.state.fetchFailureCount >= 3
      ) {
        return false;
      }
      return 60 * 1000; // 1분마다 자동 갱신
    },
  });
}
