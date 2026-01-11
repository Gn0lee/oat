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
  accountId?: string;
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
    accountId,
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
      account_id: accountId || null,
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
  accountId: string | null;
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
      account_id,
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
      accountId: t.account_id,
      owner: {
        id: profile?.id ?? t.owner_id,
        name: profile?.name ?? "알 수 없음",
      },
    };
  });

  return createPaginatedResult(transactions, count ?? 0, pagination);
}

// ============================================================================
// 거래 수정/삭제 관련 함수
// ============================================================================

export interface UpdateTransactionParams {
  quantity?: number;
  price?: number;
  transactedAt?: string;
  memo?: string | null;
  accountId?: string | null;
}

/**
 * 단일 거래 조회
 */
export async function getTransactionById(
  supabase: SupabaseClient<Database>,
  transactionId: string,
  householdId: string,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new APIError("NOT_FOUND", "거래를 찾을 수 없습니다.", 404);
    }
    console.error("Transaction query error:", error);
    throw new APIError("TRANSACTION_ERROR", "거래 조회에 실패했습니다.", 500);
  }

  return data;
}

/**
 * 거래 수정
 * - 수정 가능: quantity, price, transactedAt, memo
 * - 매도 거래 수정 시 보유 수량 재검증
 */
export async function updateTransaction(
  supabase: SupabaseClient<Database>,
  transactionId: string,
  householdId: string,
  userId: string,
  params: UpdateTransactionParams,
): Promise<Transaction> {
  // 1. 기존 거래 조회
  const existingTransaction = await getTransactionById(
    supabase,
    transactionId,
    householdId,
  );

  // 2. 소유권 확인
  if (existingTransaction.owner_id !== userId) {
    throw new APIError("FORBIDDEN", "본인의 거래만 수정할 수 있습니다.", 403);
  }

  // 3. 매도 거래 수정 시 보유 수량 재검증
  if (existingTransaction.type === "sell" && params.quantity !== undefined) {
    const currentQuantity = await getHoldingQuantity(
      supabase,
      householdId,
      userId,
      existingTransaction.ticker,
    );

    // 현재 보유량 + 기존 매도 수량 - 새 매도 수량 >= 0
    const originalQuantity = Number(existingTransaction.quantity);
    const newQuantity = params.quantity;
    const availableQuantity = currentQuantity + originalQuantity;

    if (availableQuantity < newQuantity) {
      throw new APIError(
        "INSUFFICIENT_QUANTITY",
        `매도 가능 수량(${availableQuantity})이 수정하려는 수량(${newQuantity})보다 적습니다.`,
        400,
      );
    }
  }

  // 4. 거래 업데이트
  const updateData: Record<string, unknown> = {};
  if (params.quantity !== undefined) updateData.quantity = params.quantity;
  if (params.price !== undefined) updateData.price = params.price;
  if (params.transactedAt !== undefined)
    updateData.transacted_at = params.transactedAt;
  if (params.memo !== undefined) updateData.memo = params.memo;
  if (params.accountId !== undefined) updateData.account_id = params.accountId;

  const { data, error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Transaction update error:", error);
    throw new APIError("TRANSACTION_ERROR", "거래 수정에 실패했습니다.", 500);
  }

  return data;
}

/**
 * 거래 삭제
 */
export async function deleteTransaction(
  supabase: SupabaseClient<Database>,
  transactionId: string,
  householdId: string,
  userId: string,
): Promise<void> {
  // 1. 기존 거래 조회 (존재 여부 확인)
  const existingTransaction = await getTransactionById(
    supabase,
    transactionId,
    householdId,
  );

  // 2. 소유권 확인
  if (existingTransaction.owner_id !== userId) {
    throw new APIError("FORBIDDEN", "본인의 거래만 삭제할 수 있습니다.", 403);
  }

  // 3. 거래 삭제
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .eq("owner_id", userId);

  if (error) {
    console.error("Transaction delete error:", error);
    throw new APIError("TRANSACTION_ERROR", "거래 삭제에 실패했습니다.", 500);
  }
}

// ============================================================================
// 배치 거래 생성
// ============================================================================

export interface BatchTransactionItem {
  ticker: string;
  quantity: number;
  price: number;
  memo?: string;
  stock: {
    name: string;
    market: MarketType;
    currency: CurrencyType;
    assetType?: AssetType;
  };
}

export interface CreateBatchTransactionsParams {
  householdId: string;
  ownerId: string;
  type: "buy" | "sell";
  transactedAt: string;
  accountId?: string;
  items: BatchTransactionItem[];
}

/**
 * 배치 거래 생성
 * 1. 모든 종목의 stock_settings UPSERT
 * 2. 매도 시 종목별 보유 수량 검증 (같은 종목 매도 수량 누적)
 * 3. 트랜잭션으로 일괄 INSERT
 */
export async function createBatchTransactions(
  supabase: SupabaseClient<Database>,
  params: CreateBatchTransactionsParams,
): Promise<Transaction[]> {
  const { householdId, ownerId, type, transactedAt, accountId, items } = params;

  // 1. 종목별 stock_settings UPSERT (중복 제거)
  const uniqueTickersMap = new Map<string, BatchTransactionItem>();
  for (const item of items) {
    if (!uniqueTickersMap.has(item.ticker)) {
      uniqueTickersMap.set(item.ticker, item);
    }
  }

  for (const item of uniqueTickersMap.values()) {
    const { error: settingsError } = await supabase
      .from("household_stock_settings")
      .upsert(
        {
          household_id: householdId,
          ticker: item.ticker,
          name: item.stock.name,
          market: item.stock.market,
          currency: item.stock.currency,
          asset_type: item.stock.assetType ?? "equity",
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
  }

  // 2. 매도 시 종목별 누적 수량 검증
  if (type === "sell") {
    // 같은 종목 매도 수량 합산
    const sellQuantityByTicker = items.reduce(
      (acc, item) => {
        acc[item.ticker] = (acc[item.ticker] || 0) + item.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 모든 초과 종목 수집
    const insufficientStocks: string[] = [];

    for (const [ticker, totalSellQuantity] of Object.entries(
      sellQuantityByTicker,
    )) {
      const currentQuantity = await getHoldingQuantity(
        supabase,
        householdId,
        ownerId,
        ticker,
      );

      if (currentQuantity < totalSellQuantity) {
        const stockName =
          items.find((i) => i.ticker === ticker)?.stock.name || ticker;
        insufficientStocks.push(
          `${stockName}: 보유 ${currentQuantity}주, 매도 ${totalSellQuantity}주`,
        );
      }
    }

    // 초과 종목이 있으면 모두 표시
    if (insufficientStocks.length > 0) {
      throw new APIError(
        "INSUFFICIENT_QUANTITY",
        `보유 수량이 부족합니다.\n${insufficientStocks.join("\n")}`,
        400,
      );
    }
  }

  // 3. 일괄 INSERT
  const insertData = items.map((item) => ({
    household_id: householdId,
    owner_id: ownerId,
    ticker: item.ticker,
    type,
    quantity: item.quantity,
    price: item.price,
    transacted_at: transactedAt,
    memo: item.memo || null,
    account_id: accountId || null,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(insertData)
    .select();

  if (error) {
    console.error("Batch transaction insert error:", error);
    throw new APIError("TRANSACTION_ERROR", "거래 저장에 실패했습니다.", 500);
  }

  return data;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

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
