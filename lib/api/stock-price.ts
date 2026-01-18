/**
 * 주식 가격 조회 서비스
 *
 * - KIS API를 통한 주식 시세 조회
 * - 1시간 버킷 단위 캐싱
 * - 국내 주식은 멀티종목 API로 배치 조회 (최대 30개)
 * - 해외 주식은 개별 API 병렬 호출
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDomesticMultiPrice,
  getExchangeCode,
  getOverseasPrice,
  MAX_MULTI_STOCKS,
} from "@/lib/kis/client";
import type {
  StockPriceResult,
  StockPriceRow,
  StockQuery,
} from "@/lib/kis/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, MarketType } from "@/types";

// 캐시 버킷 단위: 1시간 (밀리초)
const BUCKET_MS = 60 * 60 * 1000;

/**
 * 현재 시간의 버킷 번호 계산
 */
function getCurrentBucket(): number {
  return Math.floor(Date.now() / BUCKET_MS);
}

/**
 * 캐시 유효성 검사 (같은 시간 버킷인지)
 */
function isCacheValid(fetchedAt: Date): boolean {
  const currentBucket = getCurrentBucket();
  const cacheBucket = Math.floor(fetchedAt.getTime() / BUCKET_MS);
  return currentBucket === cacheBucket;
}

/**
 * 종목 키 생성 (market:code)
 */
function createStockKey(market: MarketType, code: string): string {
  return `${market}:${code}`;
}

/**
 * DB에서 캐시된 가격 조회
 */
async function getCachedPrices(
  supabase: SupabaseClient<Database>,
  stocks: StockQuery[],
): Promise<Map<string, StockPriceResult>> {
  if (stocks.length === 0) {
    return new Map();
  }

  // 시장별로 분리하여 조회 (PostgREST의 복합 OR 조건 한계 우회)
  const krCodes = stocks.filter((s) => s.market === "KR").map((s) => s.code);
  const usCodes = stocks.filter((s) => s.market === "US").map((s) => s.code);

  const fetchKrPrices = async (): Promise<StockPriceRow[]> => {
    if (krCodes.length === 0) return [];
    const { data, error } = await supabase
      .from("stock_prices")
      .select("market, code, price, change_rate, fetched_at")
      .eq("market", "KR")
      .in("code", krCodes);
    if (error) {
      console.error("KR cache query error:", error);
      return [];
    }
    return (data ?? []) as StockPriceRow[];
  };

  const fetchUsPrices = async (): Promise<StockPriceRow[]> => {
    if (usCodes.length === 0) return [];
    const { data, error } = await supabase
      .from("stock_prices")
      .select("market, code, price, change_rate, fetched_at")
      .eq("market", "US")
      .in("code", usCodes);
    if (error) {
      console.error("US cache query error:", error);
      return [];
    }
    return (data ?? []) as StockPriceRow[];
  };

  const [krData, usData] = await Promise.all([
    fetchKrPrices(),
    fetchUsPrices(),
  ]);
  const data = [...krData, ...usData];

  const result = new Map<string, StockPriceResult>();

  for (const row of data) {
    const fetchedAt = new Date(row.fetched_at);

    // 캐시 유효성 검사
    if (isCacheValid(fetchedAt)) {
      const key = createStockKey(row.market as MarketType, row.code);
      result.set(key, {
        market: row.market as "KR" | "US",
        code: row.code,
        price: Number(row.price),
        changeRate: row.change_rate !== null ? Number(row.change_rate) : null,
        fetchedAt,
      });
    }
  }

  return result;
}

/**
 * 가격 데이터 DB에 upsert (admin 클라이언트 사용)
 * stock_prices 테이블은 RLS로 일반 사용자 쓰기가 차단되어 있어
 * service_role 키를 가진 admin 클라이언트로 upsert합니다.
 */
async function upsertPrices(prices: StockPriceResult[]): Promise<void> {
  if (prices.length === 0) {
    return;
  }

  const rows: StockPriceRow[] = prices.map((p) => ({
    market: p.market,
    code: p.code,
    price: p.price,
    change_rate: p.changeRate,
    fetched_at: p.fetchedAt.toISOString(),
  }));

  // 중복 제거 (ON CONFLICT DO UPDATE cannot affect row a second time 에러 방지)
  const uniqueRowsMap = new Map<string, StockPriceRow>();
  for (const row of rows) {
    const key = `${row.market}:${row.code}`;
    uniqueRowsMap.set(key, row);
  }
  const uniqueRows = Array.from(uniqueRowsMap.values());

  const admin = createAdminClient();
  const { error } = await admin
    .from("stock_prices")
    .upsert(uniqueRows, { onConflict: "market,code" });

  if (error) {
    console.error("Price upsert error:", error);
    // upsert 실패해도 결과는 반환
  }
}

/**
 * 국내 주식 가격 조회 (멀티종목 API 사용)
 */
async function fetchDomesticPrices(
  codes: string[],
): Promise<StockPriceResult[]> {
  if (codes.length === 0) {
    return [];
  }

  const results: StockPriceResult[] = [];
  const now = new Date();

  // 30개씩 배치 처리
  for (let i = 0; i < codes.length; i += MAX_MULTI_STOCKS) {
    const batch = codes.slice(i, i + MAX_MULTI_STOCKS);

    try {
      const priceData = await getDomesticMultiPrice(batch);

      for (const item of priceData) {
        // 빈 데이터 스킵
        if (!item.inter_shrn_iscd || !item.inter2_prpr) {
          continue;
        }

        results.push({
          market: "KR",
          code: item.inter_shrn_iscd,
          price: Number(item.inter2_prpr),
          changeRate: item.prdy_ctrt ? Number(item.prdy_ctrt) : null,
          fetchedAt: now,
        });
      }
    } catch (error) {
      console.error(`Domestic batch fetch error (batch ${i}):`, error);
      // 배치 실패 시 개별 종목은 건너뛰고 계속 진행
    }
  }

  return results;
}

/**
 * 해외 주식 가격 조회 (병렬 호출)
 */
async function fetchOverseasPrices(
  supabase: SupabaseClient<Database>,
  stocks: StockQuery[],
): Promise<StockPriceResult[]> {
  if (stocks.length === 0) {
    return [];
  }

  // 종목 코드의 거래소 정보 조회
  const codes = stocks.map((s) => s.code);
  const { data: stockMasters } = await supabase
    .from("stock_master")
    .select("code, exchange")
    .eq("market", "US")
    .in("code", codes);

  const exchangeMap = new Map<string, string>();
  for (const sm of stockMasters ?? []) {
    exchangeMap.set(sm.code, sm.exchange ?? "NAS");
  }

  const now = new Date();
  const results: StockPriceResult[] = [];

  // 병렬 호출
  const promises = stocks.map(async (stock) => {
    try {
      const exchange = exchangeMap.get(stock.code) ?? "NAS";
      const exchangeCode = getExchangeCode(exchange);
      const priceData = await getOverseasPrice(exchangeCode, stock.code);

      if (priceData?.last) {
        return {
          market: "US" as const,
          code: stock.code,
          price: Number(priceData.last),
          changeRate: priceData.rate ? Number(priceData.rate) : null,
          fetchedAt: now,
        };
      }
      return null;
    } catch (error) {
      console.error(`Overseas fetch error (${stock.code}):`, error);
      return null;
    }
  });

  const settledResults = await Promise.all(promises);

  for (const result of settledResults) {
    if (result !== null) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 주식 가격 조회 (캐싱 적용)
 *
 * @param supabase - Supabase 클라이언트
 * @param stocks - 조회할 종목 목록
 * @returns 종목별 가격 정보 (key: "market:code")
 *
 * @example
 * ```ts
 * const prices = await getStockPrices(supabase, [
 *   { market: 'KR', code: '005930' },  // 삼성전자
 *   { market: 'US', code: 'AAPL' },    // 애플
 * ]);
 *
 * // prices = {
 * //   'KR:005930': { price: 75000, changeRate: 1.5, ... },
 * //   'US:AAPL': { price: 195.5, changeRate: -0.3, ... },
 * // }
 * ```
 */
export async function getStockPrices(
  supabase: SupabaseClient<Database>,
  stocks: StockQuery[],
): Promise<Record<string, StockPriceResult>> {
  if (stocks.length === 0) {
    return {};
  }

  // 1. 캐시에서 유효한 가격 조회
  const cachedPrices = await getCachedPrices(supabase, stocks);

  // 2. 캐시에 없는 종목 필터링
  const uncachedStocks = stocks.filter(
    (s) => !cachedPrices.has(createStockKey(s.market, s.code)),
  );

  // 모든 종목이 캐시에 있으면 바로 반환
  if (uncachedStocks.length === 0) {
    return Object.fromEntries(cachedPrices);
  }

  // 3. 시장별로 분리
  const domesticCodes = uncachedStocks
    .filter((s) => s.market === "KR")
    .map((s) => s.code);
  const overseasStocks = uncachedStocks.filter((s) => s.market === "US");

  // 4. API 호출 (병렬)
  const [domesticPrices, overseasPrices] = await Promise.all([
    fetchDomesticPrices(domesticCodes),
    fetchOverseasPrices(supabase, overseasStocks),
  ]);

  // 5. 새로 조회한 가격을 캐시에 저장
  const newPrices = [...domesticPrices, ...overseasPrices];
  await upsertPrices(newPrices);

  // 6. 결과 병합
  const result: Record<string, StockPriceResult> =
    Object.fromEntries(cachedPrices);
  for (const price of newPrices) {
    const key = createStockKey(price.market, price.code);
    result[key] = price;
  }

  return result;
}

/**
 * 단일 종목 가격 조회
 */
export async function getStockPrice(
  supabase: SupabaseClient<Database>,
  market: MarketType,
  code: string,
): Promise<StockPriceResult | null> {
  const prices = await getStockPrices(supabase, [
    { market: market as "KR" | "US", code },
  ]);
  const key = createStockKey(market, code);
  return prices[key] ?? null;
}
