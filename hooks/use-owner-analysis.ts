import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { OwnerAnalysisData } from "@/types";

async function fetchOwnerAnalysis(): Promise<OwnerAnalysisData> {
  const response = await fetch("/api/dashboard/by-owner");

  if (!response.ok) {
    throw new Error("소유자별 분석 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

export function useOwnerAnalysis() {
  return useQuery({
    queryKey: queries.dashboard.byOwner.queryKey,
    queryFn: fetchOwnerAnalysis,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
