"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { ByRiskAnalysisData } from "@/types";

interface ByRiskAnalysisError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchByRiskAnalysis(): Promise<ByRiskAnalysisData> {
  const response = await fetch("/api/dashboard/by-risk");
  const json = await response.json();

  if (!response.ok) {
    const error = json as ByRiskAnalysisError;
    throw new Error(error.error.message);
  }

  return json as ByRiskAnalysisData;
}

export function useByRiskAnalysis() {
  return useQuery({
    queryKey: queries.dashboard.byRisk.queryKey,
    queryFn: fetchByRiskAnalysis,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
