import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateRange,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationOptions,
  type SortOptions,
} from "@/lib/utils/query";
import type {
  AssetType,
  CurrencyType,
  Database,
  MarketType,
  RiskLevel,
} from "@/types";
import { APIError } from "./error";

/**
 * 보유 현황 조회 필터
 */
export interface HoldingsFilters {
  ownerId?: string;
  assetType?: AssetType;
  market?: MarketType;
}

/**
 * 보유 현황 정렬 필드
 */
export type HoldingsSortField =
  | "name"
  | "total_invested"
  | "quantity"
  | "avg_price";

/**
 * 보유 현황 with 관련 정보
 */
export interface HoldingWithDetails {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  totalInvested: number;
  market: MarketType;
  currency: CurrencyType;
  assetType: AssetType;
  riskLevel: RiskLevel | null;
  firstTransactionAt: string | null;
  lastTransactionAt: string | null;
  owner: {
    id: string;
    name: string;
  };
}

/**
 * 보유 현황 조회 옵션
 */
export interface GetHoldingsOptions {
  filters?: HoldingsFilters;
  sort?: SortOptions<HoldingsSortField>;
  pagination?: PaginationOptions;
}

// 정렬 필드 -> DB 컬럼 매핑
const HOLDINGS_SORT_COLUMNS: Record<HoldingsSortField, string> = {
  name: "name",
  total_invested: "total_invested",
  quantity: "quantity",
  avg_price: "avg_price",
};

/**
 * 보유 현황 목록 조회
 */
export async function getHoldings(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetHoldingsOptions,
): Promise<PaginatedResult<HoldingWithDetails>> {
  const { filters, sort, pagination } = options ?? {};

  // 기본 쿼리 빌드
  let query = supabase
    .from("holdings")
    .select("*", { count: "exact" })
    .eq("household_id", householdId);

  // 필터 적용
  if (filters?.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters?.assetType) {
    query = query.eq("asset_type", filters.assetType);
  }
  if (filters?.market) {
    query = query.eq("market", filters.market);
  }

  // 정렬 적용
  const sortField = sort?.field ?? "total_invested";
  const sortDirection = sort?.direction ?? "desc";
  const sortColumn = HOLDINGS_SORT_COLUMNS[sortField];
  query = query.order(sortColumn, {
    ascending: sortDirection === "asc",
    nullsFirst: false,
  });

  // 페이지네이션 적용
  const { from, to } = calculateRange(pagination);
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Holdings query error:", error);
    throw new APIError("HOLDINGS_ERROR", "보유 현황 조회에 실패했습니다.", 500);
  }

  // 소유자 정보 조회 (별도 쿼리)
  const ownerIds = [...new Set((data ?? []).map((h) => h.owner_id))].filter(
    (id): id is string => id !== null,
  );
  const ownerMap = new Map<string, string>();

  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", ownerIds);

    for (const p of profiles ?? []) {
      ownerMap.set(p.id, p.name);
    }
  }

  // 데이터 변환
  const holdings: HoldingWithDetails[] = (data ?? []).map((h) => ({
    ticker: h.ticker ?? "",
    name: h.name ?? h.ticker ?? "",
    quantity: Number(h.quantity ?? 0),
    avgPrice: Number(h.avg_price ?? 0),
    totalInvested: Number(h.total_invested ?? 0),
    market: h.market ?? "KR",
    currency: h.currency ?? "KRW",
    assetType: h.asset_type ?? "equity",
    riskLevel: h.risk_level,
    firstTransactionAt: h.first_transaction_at,
    lastTransactionAt: h.last_transaction_at,
    owner: {
      id: h.owner_id ?? "",
      name: ownerMap.get(h.owner_id ?? "") ?? "알 수 없음",
    },
  }));

  return createPaginatedResult(holdings, count ?? 0, pagination);
}
