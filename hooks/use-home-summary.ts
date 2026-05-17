"use client";

import { useQuery } from "@tanstack/react-query";
import type { HomeSummary } from "@/lib/api/home-summary";
import { queries } from "@/lib/queries/keys";

interface HomeSummaryResponse {
  data: HomeSummary;
}

interface HomeSummaryError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchHomeSummary(params?: {
  year?: number;
  month?: number;
}): Promise<HomeSummary> {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));

  const query = searchParams.toString();
  const response = await fetch(`/api/home/summary${query ? `?${query}` : ""}`);
  const json = await response.json();

  if (!response.ok) {
    const error = json as HomeSummaryError;
    throw new Error(error.error.message);
  }

  return (json as HomeSummaryResponse).data;
}

export function useHomeSummary(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: queries.home.summary(params).queryKey,
    queryFn: () => fetchHomeSummary(params),
    staleTime: 5 * 60 * 1000,
  });
}
