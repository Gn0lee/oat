"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { DashboardSummary } from "@/types";

interface DashboardSummaryResponse extends DashboardSummary {
  missingPriceCount: number;
  exchangeRate: number;
}

interface DashboardError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await fetch("/api/dashboard/summary");
  const json = await response.json();

  if (!response.ok) {
    const error = json as DashboardError;
    throw new Error(error.error.message);
  }

  return json as DashboardSummaryResponse;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: queries.dashboard.summary.queryKey,
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
