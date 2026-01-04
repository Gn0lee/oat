import type { SupabaseClient } from "@supabase/supabase-js";
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
