import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateRange,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationOptions,
  type SortOptions,
} from "@/lib/utils/query";
import type { AssetType, Database, MarketType, RiskLevel } from "@/types";
import { APIError } from "./error";

/**
 * 종목 설정 조회 필터
 */
export interface StockSettingsFilters {
  assetType?: AssetType;
  riskLevel?: RiskLevel | "null";
  market?: MarketType;
}

/**
 * 종목 설정 정렬 필드
 */
export type StockSettingsSortField = "name" | "asset_type" | "risk_level";

/**
 * 종목 설정 with 관련 정보
 */
export interface StockSettingWithDetails {
  id: string;
  ticker: string;
  name: string;
  market: MarketType;
  assetType: AssetType;
  riskLevel: RiskLevel | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 종목 설정 조회 옵션
 */
export interface GetStockSettingsOptions {
  filters?: StockSettingsFilters;
  sort?: SortOptions<StockSettingsSortField>;
  pagination?: PaginationOptions;
}

// 정렬 필드 -> DB 컬럼 매핑
const STOCK_SETTINGS_SORT_COLUMNS: Record<StockSettingsSortField, string> = {
  name: "name",
  asset_type: "asset_type",
  risk_level: "risk_level",
};

/**
 * 종목 설정 목록 조회
 */
export async function getStockSettings(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetStockSettingsOptions,
): Promise<PaginatedResult<StockSettingWithDetails>> {
  const { filters, sort, pagination } = options ?? {};

  // 기본 쿼리 빌드
  let query = supabase
    .from("household_stock_settings")
    .select("*", { count: "exact" })
    .eq("household_id", householdId);

  // 필터 적용
  if (filters?.assetType) {
    query = query.eq("asset_type", filters.assetType);
  }
  if (filters?.riskLevel) {
    if (filters.riskLevel === "null") {
      query = query.is("risk_level", null);
    } else {
      query = query.eq("risk_level", filters.riskLevel);
    }
  }
  if (filters?.market) {
    query = query.eq("market", filters.market);
  }

  // 정렬 적용
  const sortField = sort?.field ?? "name";
  const sortDirection = sort?.direction ?? "asc";
  const sortColumn = STOCK_SETTINGS_SORT_COLUMNS[sortField];
  query = query.order(sortColumn, {
    ascending: sortDirection === "asc",
    nullsFirst: false,
  });

  // 페이지네이션 적용
  const { from, to } = calculateRange(pagination);
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Stock settings query error:", error);
    throw new APIError(
      "STOCK_SETTINGS_ERROR",
      "종목 설정 조회에 실패했습니다.",
      500,
    );
  }

  // 데이터 변환
  const settings: StockSettingWithDetails[] = (data ?? []).map((s) => ({
    id: s.id,
    ticker: s.ticker,
    name: s.name ?? s.ticker,
    market: s.market,
    assetType: s.asset_type,
    riskLevel: s.risk_level,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  return createPaginatedResult(settings, count ?? 0, pagination);
}
