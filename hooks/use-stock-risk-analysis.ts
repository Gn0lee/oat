"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { StockRiskAnalysisData } from "@/types";

interface StockRiskAnalysisError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchStockRiskAnalysis(): Promise<StockRiskAnalysisData> {
  const response = await fetch("/api/assets/stock/analysis/by-risk");
  const json = await response.json();

  if (!response.ok) {
    const error = json as StockRiskAnalysisError;
    throw new Error(error.error.message);
  }

  return json as StockRiskAnalysisData;
}

export function useStockRiskAnalysis() {
  return useQuery({
    queryKey: queries.stockAnalysis.byRisk.queryKey,
    queryFn: fetchStockRiskAnalysis,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
