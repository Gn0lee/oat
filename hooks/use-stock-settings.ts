"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import { queries } from "@/lib/queries/keys";
import type { PaginatedResult } from "@/lib/utils/query";
import type { AssetType, MarketType, RiskLevel } from "@/types";

export interface StockSettingsFilters {
  assetType?: AssetType;
  riskLevel?: RiskLevel | "null";
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
    queryKey: queries.stockSettings.list({ filters, page, pageSize }).queryKey,
    queryFn: () => fetchStockSettings(filters, page, pageSize),
    enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 종목 설정 수정 입력
 * - 자산유형은 읽기 전용이므로 수정 대상 아님
 */
interface UpdateStockSettingInput {
  riskLevel: RiskLevel | null;
}

interface UpdateStockSettingParams {
  id: string;
  data: UpdateStockSettingInput;
}

interface UpdateStockSettingResponse {
  data: StockSettingWithDetails;
}

/**
 * 종목 설정 수정 mutation 훅
 */
export function useUpdateStockSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: UpdateStockSettingParams): Promise<StockSettingWithDetails> => {
      const response = await fetch(`/api/stock-settings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok) {
        const error = json as StockSettingsError;
        throw new Error(error.error.message);
      }

      return (json as UpdateStockSettingResponse).data;
    },
    onSuccess: () => {
      // 종목 설정 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queries.stockSettings._def });
      // holdings View도 영향 받으므로 무효화
      queryClient.invalidateQueries({ queryKey: queries.holdings._def });
    },
  });
}
