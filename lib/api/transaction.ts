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
  Transaction,
  TransactionType,
} from "@/types";
import { APIError } from "./error";

export interface CreateTransactionParams {
  householdId: string;
  ownerId: string;
  ticker: string;
  type: TransactionType;
  quantity: number;
  price: number;
  transactedAt: string;
  memo?: string;
  stock: {
    name: string;
    market: MarketType;
    currency: CurrencyType;
    assetType?: AssetType;
  };
}

/**
 * 거래 생성
 * 1. 종목 설정이 없으면 자동 생성 (UPSERT)
 * 2. 매도 시 보유 수량 검증
 * 3. 거래 기록 INSERT
 */
export async function createTransaction(
  supabase: SupabaseClient<Database>,
  params: CreateTransactionParams,
): Promise<Transaction> {
  const {
    householdId,
    ownerId,
    ticker,
    type,
    quantity,
    price,
    transactedAt,
    memo,
    stock,
  } = params;

  // 1. household_stock_settings UPSERT (첫 거래 시 자동 생성)
  // risk_level은 null로 저장 → asset_type 기반 기본값 사용 (Application 레벨)
  const { error: settingsError } = await supabase
    .from("household_stock_settings")
    .upsert(
      {
        household_id: householdId,
        ticker,
        name: stock.name,
        market: stock.market,
        currency: stock.currency,
        asset_type: stock.assetType ?? "equity",
      },
      { onConflict: "household_id,ticker" },
    );

  if (settingsError) {
    console.error("household_stock_settings upsert error:", settingsError);
    throw new APIError(
      "STOCK_SETTINGS_ERROR",
      "종목 설정 저장에 실패했습니다.",
      500,
    );
  }

  // 2. 매도 시 보유 수량 검증
  if (type === "sell") {
    const currentQuantity = await getHoldingQuantity(
      supabase,
      householdId,
      ownerId,
      ticker,
    );

    if (currentQuantity < quantity) {
      throw new APIError(
        "INSUFFICIENT_QUANTITY",
        `보유 수량(${currentQuantity})이 매도 수량(${quantity})보다 적습니다.`,
        400,
      );
    }
  }

  // 3. 거래 기록 INSERT
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: householdId,
      owner_id: ownerId,
      ticker,
      type,
      quantity,
      price,
      transacted_at: transactedAt,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Transaction insert error:", error);
    throw new APIError("TRANSACTION_ERROR", "거래 저장에 실패했습니다.", 500);
  }

  return data;
}

/**
 * 거래 내역 조회 필터
 */
export interface TransactionFilters {
  type?: TransactionType;
  ownerId?: string;
  ticker?: string;
}

/**
 * 거래 내역 정렬 필드
 */
export type TransactionSortField =
  | "transacted_at"
  | "ticker"
  | "quantity"
  | "price";

/**
 * 거래 내역 with 관련 정보
 */
export interface TransactionWithDetails {
  id: string;
  ticker: string;
  stockName: string;
  type: TransactionType;
  quantity: number;
  price: number;
  totalAmount: number;
  currency: CurrencyType;
  transactedAt: string;
  memo: string | null;
  owner: {
    id: string;
    name: string;
  };
}

/**
 * 거래 내역 조회 옵션
 */
export interface GetTransactionsOptions {
  filters?: TransactionFilters;
  sort?: SortOptions<TransactionSortField>;
  pagination?: PaginationOptions;
}

// 정렬 필드 → DB 컬럼 매핑
const TRANSACTION_SORT_COLUMNS: Record<TransactionSortField, string> = {
  transacted_at: "transacted_at",
  ticker: "ticker",
  quantity: "quantity",
  price: "price",
};

/**
 * 거래 내역 목록 조회
 */
export async function getTransactions(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetTransactionsOptions,
): Promise<PaginatedResult<TransactionWithDetails>> {
  const { filters, sort, pagination } = options ?? {};

  // 기본 쿼리 빌드
  let query = supabase
    .from("transactions")
    .select(
      `
      id,
      ticker,
      type,
      quantity,
      price,
      transacted_at,
      memo,
      owner_id,
      profiles!transactions_owner_id_fkey (
        id,
        name
      )
    `,
      { count: "exact" },
    )
    .eq("household_id", householdId);

  // 필터 적용
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters?.ticker) {
    query = query.eq("ticker", filters.ticker);
  }

  // 정렬 적용
  const sortField = sort?.field ?? "transacted_at";
  const sortDirection = sort?.direction ?? "desc";
  const sortColumn = TRANSACTION_SORT_COLUMNS[sortField];
  query = query.order(sortColumn, { ascending: sortDirection === "asc" });

  // 페이지네이션 적용
  const { from, to } = calculateRange(pagination);
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Transactions query error:", error);
    throw new APIError(
      "TRANSACTIONS_ERROR",
      "거래 내역 조회에 실패했습니다.",
      500,
    );
  }

  // 종목 정보 조회 (별도 쿼리)
  const tickers = [...new Set((data ?? []).map((t) => t.ticker))];
  const stockSettingsMap = new Map<
    string,
    { name: string; currency: CurrencyType }
  >();

  if (tickers.length > 0) {
    const { data: stockSettings } = await supabase
      .from("household_stock_settings")
      .select("ticker, name, currency")
      .eq("household_id", householdId)
      .in("ticker", tickers);

    for (const s of stockSettings ?? []) {
      stockSettingsMap.set(s.ticker, { name: s.name, currency: s.currency });
    }
  }

  // 데이터 변환
  const transactions: TransactionWithDetails[] = (data ?? []).map((t) => {
    const profile = t.profiles as { id: string; name: string } | null;
    const stockSettings = stockSettingsMap.get(t.ticker);

    return {
      id: t.id,
      ticker: t.ticker,
      stockName: stockSettings?.name ?? t.ticker,
      type: t.type,
      quantity: Number(t.quantity),
      price: Number(t.price),
      totalAmount: Number(t.quantity) * Number(t.price),
      currency: stockSettings?.currency ?? "KRW",
      transactedAt: t.transacted_at,
      memo: t.memo,
      owner: {
        id: profile?.id ?? t.owner_id,
        name: profile?.name ?? "알 수 없음",
      },
    };
  });

  return createPaginatedResult(transactions, count ?? 0, pagination);
}

/**
 * 특정 종목의 현재 보유 수량 조회
 */
async function getHoldingQuantity(
  supabase: SupabaseClient<Database>,
  householdId: string,
  ownerId: string,
  ticker: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("holdings")
    .select("quantity")
    .eq("household_id", householdId)
    .eq("owner_id", ownerId)
    .eq("ticker", ticker)
    .single();

  if (error) {
    // PGRST116: 결과 없음 (보유하지 않은 종목)
    if (error.code === "PGRST116") {
      return 0;
    }
    console.error("Holdings query error:", error);
    throw new APIError("HOLDINGS_ERROR", "보유 현황 조회에 실패했습니다.", 500);
  }

  return Number(data?.quantity ?? 0);
}
