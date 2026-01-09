import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrencyType, Database } from "@/types";
import { APIError } from "./error";

/**
 * 환율 정보 반환 타입
 */
export interface ExchangeRateResult {
  rate: number;
  updatedAt: string | null;
}

/**
 * 환율 조회
 * @param supabase Supabase 클라이언트
 * @param fromCurrency 기준 통화 (기본: USD)
 * @param toCurrency 환산 통화 (기본: KRW)
 * @returns 환율과 갱신 시간
 */
export async function getExchangeRate(
  supabase: SupabaseClient<Database>,
  fromCurrency: CurrencyType = "USD",
  toCurrency: CurrencyType = "KRW",
): Promise<ExchangeRateResult> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, updated_at")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .single();

  if (error) {
    console.error("Exchange rate query error:", error);
    throw new APIError("EXCHANGE_RATE_ERROR", "환율 조회에 실패했습니다.", 500);
  }

  if (!data) {
    throw new APIError("EXCHANGE_RATE_NOT_FOUND", "환율 정보가 없습니다.", 404);
  }

  return {
    rate: Number(data.rate),
    updatedAt: data.updated_at,
  };
}

/**
 * 환율 조회 (안전한 버전 - 에러 시 null 반환)
 */
export async function getExchangeRateSafe(
  supabase: SupabaseClient<Database>,
  fromCurrency: CurrencyType = "USD",
  toCurrency: CurrencyType = "KRW",
): Promise<ExchangeRateResult | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, updated_at")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .single();

  if (error || !data) {
    console.error("Exchange rate query error:", error);
    return null;
  }

  return {
    rate: Number(data.rate),
    updatedAt: data.updated_at,
  };
}

/**
 * 전체 환율 정보 반환 타입
 */
export interface ExchangeRateWithCurrency {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: string | null;
}

/**
 * 모든 환율 조회
 */
export async function getAllExchangeRates(
  supabase: SupabaseClient<Database>,
): Promise<ExchangeRateWithCurrency[]> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("from_currency, to_currency, rate, updated_at")
    .order("from_currency");

  if (error || !data) {
    console.error("Exchange rates query error:", error);
    return [];
  }

  return data.map((row) => ({
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: Number(row.rate),
    updatedAt: row.updated_at,
  }));
}
