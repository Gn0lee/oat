/**
 * KIS Open API 클라이언트
 *
 * - 토큰 발급 및 자동 갱신
 * - 국내 주식 시세 조회 (단일/멀티)
 * - 해외 주식 시세 조회
 */

import { APIError } from "@/lib/api/error";
import type {
  CachedToken,
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

// 토큰 만료 1시간 전에 갱신
const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000;

// 멀티종목 조회 최대 개수
export const MAX_MULTI_STOCKS = 30;

// ============================================================================
// 토큰 캐시 (메모리)
// ============================================================================

let cachedToken: CachedToken | null = null;

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
 * 액세스 토큰 발급
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

  // 토큰 캐시 저장
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  cachedToken = {
    accessToken: data.access_token,
    expiresAt,
  };

  return data.access_token;
}

/**
 * 유효한 액세스 토큰 가져오기 (자동 갱신)
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효한지 확인
  if (cachedToken) {
    const now = Date.now();
    const expiresAt = cachedToken.expiresAt.getTime();

    // 만료 1시간 전까지 유효
    if (now < expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return cachedToken.accessToken;
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
export function clearTokenCache(): void {
  cachedToken = null;
}
