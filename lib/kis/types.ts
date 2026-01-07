/**
 * KIS Open API 타입 정의
 */

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * KIS API 응답 공통 구조
 */
export interface KISAPIResponse<T> {
  rt_cd: string; // 성공실패여부 (0: 성공)
  msg_cd: string; // 응답코드
  msg1: string; // 응답메시지
  output?: T;
  output1?: T;
}

/**
 * KIS API 에러
 */
export interface KISAPIError {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}

// ============================================================================
// 인증 관련 타입
// ============================================================================

/**
 * 토큰 발급 요청
 */
export interface KISTokenRequest {
  grant_type: "client_credentials";
  appkey: string;
  appsecret: string;
}

/**
 * 토큰 발급 응답
 */
export interface KISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
}

/**
 * 캐시된 토큰 정보
 */
export interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

// ============================================================================
// 국내 주식 시세 타입
// ============================================================================

/**
 * 국내 주식 현재가 시세 응답 (단일 종목)
 * API: /uapi/domestic-stock/v1/quotations/inquire-price
 */
export interface KISDomesticPriceOutput {
  stck_prpr: string; // 주식 현재가
  prdy_vrss: string; // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  prdy_ctrt: string; // 전일 대비율 (%)
  stck_oprc: string; // 주식 시가
  stck_hgpr: string; // 주식 최고가
  stck_lwpr: string; // 주식 최저가
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래 대금
  hts_avls: string; // HTS 시가총액
  per: string; // PER
  pbr: string; // PBR
}

/**
 * 국내 주식 멀티종목 시세 응답
 * API: /uapi/domestic-stock/v1/quotations/intstock-multprice
 */
export interface KISDomesticMultiPriceOutput {
  inter_shrn_iscd: string; // 관심 단축 종목코드
  inter_kor_isnm: string; // 관심 한글 종목명
  inter2_prpr: string; // 관심2 현재가
  inter2_prdy_vrss: string; // 관심2 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호
  prdy_ctrt: string; // 전일 대비율 (%)
  acml_vol: string; // 누적 거래량
  inter2_oprc: string; // 관심2 시가
  inter2_hgpr: string; // 관심2 고가
  inter2_lwpr: string; // 관심2 저가
  acml_tr_pbmn: string; // 누적 거래 대금
}

// ============================================================================
// 해외 주식 시세 타입
// ============================================================================

/**
 * 해외 거래소 코드
 */
export type OverseasExchangeCode =
  | "NAS" // 나스닥
  | "NYS" // 뉴욕
  | "AMS" // 아멕스
  | "HKS" // 홍콩
  | "TSE" // 도쿄
  | "SHS" // 상해
  | "SZS" // 심천
  | "HSX" // 호치민
  | "HNX"; // 하노이

/**
 * 해외 주식 현재가 응답
 * API: /uapi/overseas-price/v1/quotations/price
 */
export interface KISOverseasPriceOutput {
  rsym: string; // 실시간조회종목코드
  zdiv: string; // 소수점자리수
  base: string; // 전일종가
  pvol: string; // 전일거래량
  last: string; // 현재가
  sign: string; // 대비기호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  diff: string; // 대비
  rate: string; // 등락율 (%)
  tvol: string; // 거래량
  tamt: string; // 거래대금
  ordy: string; // 매수가능여부
}

// ============================================================================
// 서비스 입출력 타입
// ============================================================================

/**
 * 주식 조회 쿼리
 */
export interface StockQuery {
  market: "KR" | "US";
  code: string;
}

/**
 * 주식 가격 결과
 */
export interface StockPriceResult {
  market: "KR" | "US";
  code: string;
  price: number;
  changeRate: number | null;
  fetchedAt: Date;
}

/**
 * DB stock_prices 테이블 row와 매핑
 */
export interface StockPriceRow {
  market: "KR" | "US";
  code: string;
  price: number;
  change_rate: number | null;
  fetched_at: string;
}
