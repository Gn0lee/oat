"use client";

import { useQuery } from "@tanstack/react-query";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import { queries } from "@/lib/queries/keys";
import type { PaginatedResult } from "@/lib/utils/query";
import type { AssetType, MarketType, RiskLevel } from "@/types";

export interface StockSettingsFilters {
  assetType?: AssetType;
  riskLevel?: RiskLevel;
  market?: MarketType;
}

interface StockSettingsError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchStockSettings(
  filters?: StockSettingsFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<StockSettingWithDetails>> {
  const params = new URLSearchParams();

  if (filters?.assetType) params.set("assetType", filters.assetType);
  if (filters?.riskLevel) params.set("riskLevel", filters.riskLevel);
  if (filters?.market) params.set("market", filters.market);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const response = await fetch(`/api/stock-settings?${params.toString()}`);
  const json = await response.json();

  if (!response.ok) {
    const error = json as StockSettingsError;
    throw new Error(error.error.message);
  }

  return json as PaginatedResult<StockSettingWithDetails>;
}

interface UseStockSettingsParams {
  filters?: StockSettingsFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useStockSettings({
  filters,
  page = 1,
  pageSize = 20,
  enabled = true,
}: UseStockSettingsParams = {}) {
  return useQuery({
    queryKey: queries.stockSettings.list(filters).queryKey,
    queryFn: () => fetchStockSettings(filters, page, pageSize),
    enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });
}
