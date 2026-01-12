/**
 * KIS Open API 클라이언트
 *
 * - 토큰 발급 및 자동 갱신 (DB 저장)
 * - 국내 주식 시세 조회 (단일/멀티)
 * - 해외 주식 시세 조회
 */

import { APIError } from "@/lib/api/error";
import { getSystemConfigClient } from "@/lib/supabase/system-config-client";
import type {
  DomesticExchangeCodeUnion,
  KISAPIResponse,
  KISDomesticMultiPriceOutput,
  KISDomesticPriceOutput,
  KISFluctuationRankOutput,
  KISHolidayOutput,
  KISOverseasNewsOutput,
  KISOverseasPriceFluctOutput,
  KISOverseasPriceOutput,
  KISOverseasTrendOutput,
  KISOverseasVolumeSurgeOutput,
  KISTokenResponse,
  KISVolumeRankOutput,
  OverseasExchangeCodeUnion,
  OverseasTimeRangeUnion,
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
  const supabase = getSystemConfigClient();

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
  const supabase = getSystemConfigClient();

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
  exchangeCode: OverseasExchangeCodeUnion,
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
 * 국내 거래소 코드를 KIS API 시장구분코드로 변환
 * @param exchange 거래소 코드 (KRX, NXT)
 * @returns KIS API 시장구분코드 (J, NX)
 */
function mapDomesticExchangeCode(exchange: DomesticExchangeCodeUnion): string {
  const exchangeMap: Record<DomesticExchangeCodeUnion, string> = {
    KRX: "J",
    NXT: "NX",
  };

  return exchangeMap[exchange];
}

/**
 * 종목 코드에서 해외 거래소 코드 추출
 * stock_master의 exchange 컬럼 기반
 */
export function getExchangeCode(exchange: string): OverseasExchangeCodeUnion {
  const exchangeMap: Record<string, OverseasExchangeCodeUnion> = {
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
  const supabase = getSystemConfigClient();
  await supabase.from("system_config").delete().eq("key", KIS_TOKEN_KEY);
}

// ============================================================================
// 국내 주식 순위 조회
// ============================================================================

/**
 * 국내 주식 거래량 순위 조회
 * API: /uapi/domestic-stock/v1/quotations/volume-rank
 */
export async function getDomesticVolumeRank(
  exchange: DomesticExchangeCodeUnion = "KRX",
  limit = 5,
): Promise<KISVolumeRankOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`,
  );

  // 시장 구분 코드 변환 (KRX -> J, NXT -> NX)
  const marketCode = mapDomesticExchangeCode(exchange);

  console.log(marketCode, exchange);

  url.searchParams.set("FID_COND_MRKT_DIV_CODE", marketCode);
  url.searchParams.set("FID_COND_SCR_DIV_CODE", "20171"); // 거래량 순위
  url.searchParams.set("FID_INPUT_ISCD", "0000");
  url.searchParams.set("FID_DIV_CLS_CODE", "0"); // 전체
  url.searchParams.set("FID_BLNG_CLS_CODE", "0"); // 전체
  url.searchParams.set("FID_TRGT_CLS_CODE", "111111111"); // 전체
  url.searchParams.set("FID_TRGT_EXLS_CLS_CODE", "0000000000"); // 제외 없음
  url.searchParams.set("FID_INPUT_PRICE_1", ""); // 가격 조건 없음
  url.searchParams.set("FID_INPUT_PRICE_2", "");
  url.searchParams.set("FID_VOL_CNT", ""); // 거래량 조건 없음
  url.searchParams.set("FID_INPUT_DATE_1", ""); // 기간 조건 없음

  const headers = await createHeaders("FHPST01710000");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_VOLUME_RANK_ERROR",
      `거래량 순위 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    KISVolumeRankOutput[],
    KISVolumeRankOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_VOLUME_RANK_ERROR",
      `거래량 순위 조회 실패: ${data.msg1}`,
      400,
    );
  }

  // output 또는 output1에서 데이터 추출
  const items = data.output ?? data.output1 ?? [];

  return items.slice(0, limit);
}

/**
 * 국내 주식 등락률 순위 조회
 * API: /uapi/domestic-stock/v1/ranking/fluctuation
 */
export async function getDomesticFluctuationRank(
  exchange: DomesticExchangeCodeUnion = "KRX",
  direction: "up" | "down" = "up",
  limit = 5,
): Promise<KISFluctuationRankOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/fluctuation`,
  );

  // 시장 구분 코드 변환 (KRX -> J, NXT -> NX)
  const marketCode = mapDomesticExchangeCode(exchange);

  url.searchParams.set("FID_COND_MRKT_DIV_CODE", marketCode);
  url.searchParams.set("FID_COND_SCR_DIV_CODE", "20170"); // 등락률 순위
  url.searchParams.set("FID_INPUT_ISCD", exchange === "KRX" ? "0001" : "1001");
  url.searchParams.set(
    "FID_RANK_SORT_CLS_CODE",
    direction === "up" ? "0" : "1",
  ); // 0:상승률, 1:하락률
  url.searchParams.set("FID_INPUT_CNT_1", "0"); // 조회 건수 (0:전체)
  url.searchParams.set("FID_PRC_CLS_CODE", "0"); // 가격 구분
  url.searchParams.set("FID_INPUT_PRICE_1", ""); // 가격 조건 없음
  url.searchParams.set("FID_INPUT_PRICE_2", "");
  url.searchParams.set("FID_VOL_CNT", ""); // 거래량 조건 없음
  url.searchParams.set("FID_TRGT_CLS_CODE", "0"); // 대상 구분
  url.searchParams.set("FID_TRGT_EXLS_CLS_CODE", "0"); // 제외 구분
  url.searchParams.set("FID_DIV_CLS_CODE", "0"); // 분류 구분
  url.searchParams.set("FID_RSFL_RATE1", ""); // 등락률 조건 없음
  url.searchParams.set("FID_RSFL_RATE2", "");

  const headers = await createHeaders("FHPST01700000");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_FLUCTUATION_RANK_ERROR",
      `등락률 순위 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    KISFluctuationRankOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_FLUCTUATION_RANK_ERROR",
      `등락률 순위 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return (data.output ?? []).slice(0, limit);
}

// ============================================================================
// 국내 주식 휴장일 조회
// ============================================================================

/**
 * 국내 주식 휴장일 조회
 * API: /uapi/domestic-stock/v1/quotations/chk-holiday
 * tr_id: CTCA0903R
 *
 * @param baseDate 기준일자 (YYYYMMDD), 미입력 시 오늘
 * @returns 기준일로부터 한 달간 일자별 개장 여부 목록
 */
export async function getDomesticHolidays(
  baseDate?: string,
): Promise<KISHolidayOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/chk-holiday`,
  );

  // 기준일자: 미입력 시 오늘 날짜
  const today =
    baseDate ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");

  url.searchParams.set("BASS_DT", today);
  url.searchParams.set("CTX_AREA_NK", "");
  url.searchParams.set("CTX_AREA_FK", "");

  const headers = await createHeaders("CTCA0903R");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_HOLIDAY_ERROR",
      `휴장일 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    KISHolidayOutput[],
    KISHolidayOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_HOLIDAY_ERROR",
      `휴장일 조회 실패: ${data.msg1}`,
      400,
    );
  }

  // output1에서 데이터 추출
  return data.output1 ?? data.output ?? [];
}

// ============================================================================
// 해외 주식 순위 조회
// ============================================================================

/**
 * 해외주식 가격급등락 조회
 * API: /uapi/overseas-stock/v1/ranking/price-fluct
 * tr_id: HHDFS76260000
 */
export async function getOverseasPriceFluct(
  exchangeCode: OverseasExchangeCodeUnion = "NAS",
  direction: "up" | "down" = "up",
  timeRange: OverseasTimeRangeUnion = "0",
  limit = 5,
): Promise<KISOverseasPriceFluctOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/price-fluct`,
  );

  url.searchParams.set("KEYB", "");
  url.searchParams.set("AUTH", "");
  url.searchParams.set("EXCD", exchangeCode);
  url.searchParams.set("GUBN", direction === "up" ? "0" : "1"); // 0:급등, 1:급락
  url.searchParams.set("MIXN", timeRange); // N분전콤보값
  url.searchParams.set("VOL_RANG", "0"); // 거래량조건

  const headers = await createHeaders("HHDFS76260000");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_OVERSEAS_PRICE_FLUCT_ERROR",
      `해외주식 가격급등락 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    unknown,
    KISOverseasTrendOutput,
    KISOverseasPriceFluctOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_OVERSEAS_PRICE_FLUCT_ERROR",
      `해외주식 가격급등락 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return (data?.output2 ?? []).slice(0, limit);
}

/**
 * 해외주식 거래량급증 조회
 * API: /uapi/overseas-stock/v1/ranking/volume-surge
 * tr_id: HHDFS76270000
 */
export async function getOverseasVolumeSurge(
  exchangeCode: OverseasExchangeCodeUnion = "NAS",
  timeRange: OverseasTimeRangeUnion = "0",
  limit = 5,
): Promise<KISOverseasVolumeSurgeOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/volume-surge`,
  );

  url.searchParams.set("KEYB", "");
  url.searchParams.set("AUTH", "");
  url.searchParams.set("EXCD", exchangeCode);
  url.searchParams.set("MIXN", timeRange); // N분전콤보값
  url.searchParams.set("VOL_RANG", "0"); // 거래량조건

  const headers = await createHeaders("HHDFS76270000");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_OVERSEAS_VOLUME_SURGE_ERROR",
      `해외주식 거래량급증 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as KISAPIResponse<
    unknown,
    KISOverseasTrendOutput,
    KISOverseasVolumeSurgeOutput[]
  >;

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_OVERSEAS_VOLUME_SURGE_ERROR",
      `해외주식 거래량급증 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return (data?.output2 ?? []).slice(0, limit);
}

/**
 * 해외뉴스 조회
 * API: /uapi/overseas-price/v1/quotations/news-title
 * tr_id: HHPSTH60100C1
 */
export async function getOverseasNews(
  limit = 10,
): Promise<KISOverseasNewsOutput[]> {
  validateKISConfig();

  const url = new URL(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/news-title`,
  );

  url.searchParams.set("AUTH", "");
  url.searchParams.set("EXCD", ""); // 전체 거래소
  url.searchParams.set("SYMB", ""); // 전체 종목
  url.searchParams.set("GUBN", ""); // 전체 뉴스

  const headers = await createHeaders("HHPSTH60100C1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      "KIS_OVERSEAS_NEWS_ERROR",
      `해외뉴스 조회 실패: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    outblock1?: KISOverseasNewsOutput[];
  };

  if (data.rt_cd !== "0") {
    throw new APIError(
      "KIS_OVERSEAS_NEWS_ERROR",
      `해외뉴스 조회 실패: ${data.msg1}`,
      400,
    );
  }

  return (data.outblock1 ?? []).slice(0, limit);
}
