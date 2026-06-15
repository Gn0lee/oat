import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { StockOwnerAnalysisData } from "@/types";

async function fetchStockOwnerAnalysis(): Promise<StockOwnerAnalysisData> {
  const response = await fetch("/api/assets/stock/analysis/by-owner");

  if (!response.ok) {
    throw new Error("소유자별 분석 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

export function useStockOwnerAnalysis() {
  return useQuery({
    queryKey: queries.stockAnalysis.byOwner.queryKey,
    queryFn: fetchStockOwnerAnalysis,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
