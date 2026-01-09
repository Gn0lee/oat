"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { StockAnalysisData } from "@/types";

interface StockAnalysisError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchStockAnalysis(): Promise<StockAnalysisData> {
  const response = await fetch("/api/dashboard/stocks");
  const json = await response.json();

  if (!response.ok) {
    const error = json as StockAnalysisError;
    throw new Error(error.error.message);
  }

  return json as StockAnalysisData;
}

export function useStockAnalysis() {
  return useQuery({
    queryKey: queries.stocks.analysis.queryKey,
    queryFn: fetchStockAnalysis,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
