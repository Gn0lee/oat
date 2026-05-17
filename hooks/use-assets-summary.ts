"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssetsSummary } from "@/lib/api/assets-summary";
import { queries } from "@/lib/queries/keys";

interface AssetsSummaryResponse {
  data: AssetsSummary;
}

interface AssetsSummaryError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchAssetsSummary(): Promise<AssetsSummary> {
  const response = await fetch("/api/assets/summary");
  const json = await response.json();

  if (!response.ok) {
    const error = json as AssetsSummaryError;
    throw new Error(error.error.message);
  }

  return (json as AssetsSummaryResponse).data;
}

export function useAssetsSummary() {
  return useQuery({
    queryKey: queries.assets.summary.queryKey,
    queryFn: fetchAssetsSummary,
    staleTime: 5 * 60 * 1000,
  });
}
