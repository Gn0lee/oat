/**
 * KIS Open API 클라이언트
 *
 * - 토큰 발급 및 자동 갱신 (DB 저장)
 * - 국내 주식 시세 조회 (단일/멀티)
 * - 해외 주식 시세 조회
 */

import { APIError } from "@/lib/api/error";
import { createClient } from "@/lib/supabase/server";
import type {
  KISAPIResponse,
  KISDomesticMultiPriceOutput,
  KISDomesticPriceOutput,
  KISOverseasPriceOutput,
  KISTokenResponse,
  OverseasExchangeCode,
} from "./types";

// ============================================================================
// 환경변수 및 상수
// ============================================================================

const KIS_BASE_URL = process.env.KIS_BASE_URL ?? "";
const KIS_APP_KEY = process.env.KIS_APP_KEY ?? "";
const KIS_APP_SECRET = process.env.KIS_APP_SECRET ?? "";

// 멀티종목 조회 최대 개수
export const MAX_MULTI_STOCKS = 30;

// system_config 키
const KIS_TOKEN_KEY = "kis_token";

// ============================================================================
// KIS API 클라이언트
// ============================================================================

/**
 * KIS API 설정 검증
 */
function validateKISConfig(): void {
  if (!KIS_BASE_URL || !KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new APIError(
      "KIS_CONFIG_MISSING",
      "KIS API 환경변수가 설정되지 않았습니다. KIS_BASE_URL, KIS_APP_KEY, KIS_APP_SECRET을 확인하세요.",
      500,
    );
  }
}

/**
 * DB에서 저장된 토큰 조회
 */
async function getTokenFromDB(): Promise<{
  accessToken: string;
  expiresAt: Date;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", KIS_TOKEN_KEY)
    .single();

  if (error || !data) {
    return null;
  }

  const { access_token, expires_at } = data.value as {
    access_token: string;
    expires_at: string;
  };

  return {
    accessToken: access_token,
    expiresAt: new Date(expires_at),
  };
}

/**
 * 토큰을 DB에 저장
 */
async function saveTokenToDB(
  accessToken: string,
  expiresAt: Date,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("system_config").upsert(
    {
      key: KIS_TOKEN_KEY,
      value: {
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    console.error("토큰 DB 저장 실패:", error);
  }
}

/**
 * 액세스 토큰 발급 및 DB 저장
 */
async function issueToken(): Promise<string> {
  validateKISConfig();

  const url = `${KIS_BASE_URL}/oauth2/tokenP`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_TOKEN_ERROR",
      `KIS 토큰 발급 실패: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISTokenResponse;
  const expiresAt = new Date(data.access_token_token_expired);

  // DB에 토큰 저장
  await saveTokenToDB(data.access_token, expiresAt);

  return data.access_token;
}

/**
 * 유효한 액세스 토큰 가져오기 (DB 조회 → 만료 시 재발급)
 */
async function getAccessToken(): Promise<string> {
  // DB에서 토큰 조회
  const cached = await getTokenFromDB();

  if (cached) {
    const now = Date.now();
    const expiresAt = cached.expiresAt.getTime();

    // 만료 전이면 유효
    if (now < expiresAt) {
      return cached.accessToken;
    }
  }

  // 새 토큰 발급
  return issueToken();
}

/**
 * KIS API 공통 헤더 생성
 */
async function createHeaders(trId: string): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  return {
    "Content-Type": "application/json; charset=utf-8",
    authorization: `Bearer ${accessToken}`,
    appkey: KIS_APP_KEY,
    appsecret: KIS_APP_SECRET,
    tr_id: trId,
  };
}

// ============================================================================
// 국내 주식 시세 조회
// ============================================================================

/**
 * 국내 주식 현재가 조회 (단일 종목)
 */
export async function getDomesticPrice(
  stockCode: string,
): Promise<KISDomesticPriceOutput | null> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
  );
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", stockCode);

  const headers = await createHeaders("FHKST01010100");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_DOMESTIC_PRICE_ERROR",
      `국내 주식 시세 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data =
    (await response.json()) as KISAPIResponse<KISDomesticPriceOutput>;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_DOMESTIC_PRICE_ERROR",
      `국내 주식 시세 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return data.output ?? null;
}

/**
 * 국내 주식 현재가 조회 (멀티 종목, 최대 30개)
 */
export async function getDomesticMultiPrice(
  stockCodes: string[],
): Promise<KISDomesticMultiPriceOutput[]> {
  validateKISConfig();

  if (stockCodes.length === 0) {
    return [];
  }

  if (stockCodes.length > MAX_MULTI_STOCKS) {
    throw new APIError(
      "KIS_MULTI_PRICE_LIMIT",
      `멀티종목 조회는 최대 ${MAX_MULTI_STOCKS}개까지 가능합니다.`,
      400,
    );
  }

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/intstock-multprice`,
  );

  // 종목 코드를 쿼리 파라미터로 설정 (1~30)
  stockCodes.forEach((code, index) => {
    const num = index + 1;
    url.searchParams.set(`FID_COND_MRKT_DIV_CODE_${num}`, "J");
    url.searchParams.set(`FID_INPUT_ISCD_${num}`, code);
  });

  const headers = await createHeaders("FHKST11300006");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_DOMESTIC_MULTI_PRICE_ERROR",
      `국내 주식 멀티종목 시세 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    KISDomesticMultiPriceOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_DOMESTIC_MULTI_PRICE_ERROR",
      `국내 주식 멀티종목 시세 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return data.output ?? [];
}

// ============================================================================
// 해외 주식 시세 조회
// ============================================================================

/**
 * 해외 주식 현재가 조회 (단일 종목)
 */
export async function getOverseasPrice(
  exchangeCode: OverseasExchangeCode,
  symbol: string,
): Promise<KISOverseasPriceOutput | null> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price`,
  );
  url.searchParams.set("AUTH", "");
  url.searchParams.set("EXCD", exchangeCode);
  url.searchParams.set("SYMB", symbol);

  const headers = await createHeaders("HHDFS00000300");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_OVERSEAS_PRICE_ERROR",
      `해외 주식 시세 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data =
    (await response.json()) as KISAPIResponse<KISOverseasPriceOutput>;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_OVERSEAS_PRICE_ERROR",
      `해외 주식 시세 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return data.output ?? null;
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 종목 코드에서 해외 거래소 코드 추출
 * stock_master의 exchange 컬럼 기반
 */
export function getExchangeCode(exchange: string): OverseasExchangeCode {
  const exchangeMap: Record<string, OverseasExchangeCode> = {
    NASDAQ: "NAS",
    NYSE: "NYS",
    AMEX: "AMS",
    // 필요시 추가
  };

  return exchangeMap[exchange] ?? "NAS";
}

/**
 * 토큰 캐시 초기화 (테스트용)
 */
export async function clearTokenCache(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("system_config").delete().eq("key", KIS_TOKEN_KEY);
}
