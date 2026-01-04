"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { MarketType, StockMaster } from "@/types";

interface StockSearchResponse {
  data: StockMaster[];
}

interface StockSearchError {
  error: {
    code: string;
    message: string;
  };
}

interface UseStockSearchParams {
  query: string;
  market?: MarketType;
  limit?: number;
  enabled?: boolean;
}

async function fetchStocks(
  query: string,
  market?: MarketType,
  limit?: number,
): Promise<StockMaster[]> {
  const params = new URLSearchParams({ q: query });
  if (market) params.set("market", market);
  if (limit) params.set("limit", String(limit));

  const response = await fetch(`/api/stocks/search?${params}`);
  const json = await response.json();

  if (!response.ok) {
    const error = json as StockSearchError;
    throw new Error(error.error.message);
  }

  return (json as StockSearchResponse).data;
}

export function useStockSearch({
  query,
  market,
  limit = 20,
  enabled = true,
}: UseStockSearchParams) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: queries.stocks.search(trimmedQuery).queryKey,
    queryFn: () => fetchStocks(trimmedQuery, market, limit),
    enabled: enabled && trimmedQuery.length > 0,
    staleTime: 1000 * 60 * 5, // 5분
  });
}
