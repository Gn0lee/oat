"use client";

import { useQuery } from "@tanstack/react-query";
import type { HoldingsFilters, HoldingWithDetails } from "@/lib/api/holdings";
import { queries } from "@/lib/queries/keys";
import type { PaginatedResult } from "@/lib/utils/query";

interface UseHoldingsParams {
  filters?: HoldingsFilters;
  page?: number;
  pageSize?: number;
}

async function fetchHoldings({
  filters,
  page = 1,
  pageSize = 20,
}: UseHoldingsParams): Promise<PaginatedResult<HoldingWithDetails>> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set("ownerId", filters.ownerId);
  if (filters?.assetType) params.set("assetType", filters.assetType);
  if (filters?.market) params.set("market", filters.market);
  if (filters?.accountId) params.set("accountId", filters.accountId);
  if (filters?.search) params.set("search", filters.search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const response = await fetch(`/api/holdings?${params.toString()}`);

  if (!response.ok) {
    throw new Error("보유 현황 조회에 실패했습니다.");
  }

  return response.json();
}

export function useHoldings(params: UseHoldingsParams = {}) {
  return useQuery({
    queryKey: queries.holdings.list(params).queryKey,
    queryFn: () => fetchHoldings(params),
    staleTime: 1000 * 60 * 5,
  });
}
