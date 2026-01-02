/**
 * ExchangeRate-API에서 환율 데이터를 가져와 exchange_rates 테이블에 동기화하는 스크립트
 *
 * 사용법:
 *   pnpm sync:exchange-rates
 *
 * 환경변수:
 *   SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   EXCHANGE_RATE_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// 로컬 환경에서 .env.local 로드 (GitHub Actions에서는 이미 환경변수가 설정됨)
config({ path: ".env.local" });

import type { Database } from "../types/supabase";

// 환경변수
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    "환경변수가 필요합니다: SUPABASE_URL (또는 NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SECRET_KEY",
  );
  process.exit(1);
}

if (!EXCHANGE_RATE_API_KEY) {
  console.error("환경변수가 필요합니다: EXCHANGE_RATE_API_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY);

// ExchangeRate-API 응답 타입
interface ExchangeRateResponse {
  result: "success" | "error";
  base_code: string;
  conversion_rates: {
    KRW: number;
    [key: string]: number;
  };
  time_last_update_utc: string;
}

/**
 * ExchangeRate-API에서 환율 데이터 조회
 */
async function fetchExchangeRate(): Promise<number> {
  const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
  }

  const data: ExchangeRateResponse = await response.json();

  if (data.result !== "success") {
    throw new Error("API 응답 오류");
  }

  console.log(`  기준 통화: ${data.base_code}`);
  console.log(`  최종 업데이트: ${data.time_last_update_utc}`);
  console.log(`  USD → KRW: ${data.conversion_rates.KRW}`);

  return data.conversion_rates.KRW;
}

/**
 * Supabase에 환율 데이터 UPSERT (USD↔KRW 양방향 저장)
 */
async function upsertExchangeRate(usdToKrw: number): Promise<void> {
  const now = new Date().toISOString();
  const krwToUsd = 1 / usdToKrw;

  const { error } = await supabase.from("exchange_rates").upsert(
    [
      {
        from_currency: "USD",
        to_currency: "KRW",
        rate: usdToKrw,
        updated_at: now,
      },
      {
        from_currency: "KRW",
        to_currency: "USD",
        rate: krwToUsd,
        updated_at: now,
      },
    ],
    { onConflict: "from_currency,to_currency" },
  );

  if (error) {
    throw new Error(`UPSERT 오류: ${error.message}`);
  }

  console.log(`  KRW → USD: ${krwToUsd.toFixed(6)}`);
  console.log("  UPSERT 완료");
}

/**
 * 메인 함수
 */
async function main() {
  console.log("=== 환율 동기화 시작 ===\n");

  console.log("[ExchangeRate-API 조회]");
  const rate = await fetchExchangeRate();

  console.log("\n[Supabase UPSERT]");
  await upsertExchangeRate(rate);

  console.log("\n=== 환율 동기화 완료 ===");
}

main().catch((error) => {
  console.error("동기화 실패:", error);
  process.exit(1);
});
