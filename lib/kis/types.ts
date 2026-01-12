/**
 * KIS Open API 타입 정의
 */

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * KIS API 응답 공통 구조
 */
export interface KISAPIResponse<
  Output = unknown,
  Output1 = unknown,
  Output2 = unknown,
> {
  rt_cd: string; // 성공실패여부 (0: 성공)
  msg_cd: string; // 응답코드
  msg1: string; // 응답메시지
  output?: Output;
  output1?: Output1;
  output2?: Output2;
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

// ============================================================================
// 국내 주식 순위 타입
// ============================================================================

/**
 * 국내 주식 거래량 순위 응답
 * API: /uapi/domestic-stock/v1/quotations/volume-rank
 */
export interface KISVolumeRankOutput {
  hts_kor_isnm: string; // HTS 한글 종목명
  mksc_shrn_iscd: string; // 유가증권 단축 종목코드
  data_rank: string; // 데이터 순위
  stck_prpr: string; // 주식 현재가
  prdy_vrss_sign: string; // 전일 대비 부호
  prdy_vrss: string; // 전일 대비
  prdy_ctrt: string; // 전일 대비율
  acml_vol: string; // 누적 거래량
  prdy_vol: string; // 전일 거래량
  lstn_stcn: string; // 상장 주수
  avrg_vol: string; // 평균 거래량
  n_befr_clpr_vrss_prpr_rate: string; // N일전종가대비현재가대비율
  vol_inrt: string; // 거래량증가율
  vol_tnrt: string; // 거래량 회전율
  nday_vol_tnrt: string; // N일 거래량 회전율
  avrg_tr_pbmn: string; // 평균 거래 대금
  tr_pbmn_tnrt: string; // 거래대금회전율
  nday_tr_pbmn_tnrt: string; // N일 거래대금 회전율
  acml_tr_pbmn: string; // 누적 거래 대금
}

/**
 * 국내 주식 등락률 순위 응답
 * API: /uapi/domestic-stock/v1/ranking/fluctuation
 */
export interface KISFluctuationRankOutput {
  stck_shrn_iscd: string; // 주식 단축 종목코드
  data_rank: string; // 데이터 순위
  hts_kor_isnm: string; // HTS 한글 종목명
  stck_prpr: string; // 주식 현재가
  prdy_vrss: string; // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호
  prdy_ctrt: string; // 전일 대비율
  acml_vol: string; // 누적 거래량
  stck_hgpr: string; // 주식 최고가
  hgpr_hour: string; // 최고가 시간
  acml_hgpr_date: string; // 누적 최고가 일자
  stck_lwpr: string; // 주식 최저가
  lwpr_hour: string; // 최저가 시간
  acml_lwpr_date: string; // 누적 최저가 일자
  lwpr_vrss_prpr_rate: string; // 최저가 대비 현재가 비율
  dsgt_date_clpr_vrss_prpr_rate: string; // 지정 일자 종가 대비 현재가 비율
  cnnt_ascn_dynu: string; // 연속 상승 일수
  hgpr_vrss_prpr_rate: string; // 최고가 대비 현재가 비율
  cnnt_down_dynu: string; // 연속 하락 일수
  oprc_vrss_prpr_sign: string; // 시가2 대비 현재가 부호
  oprc_vrss_prpr: string; // 시가2 대비 현재가
  oprc_vrss_prpr_rate: string; // 시가2 대비 현재가 비율
  prd_rsfl: string; // 기간 등락
  prd_rsfl_rate: string; // 기간 등락 비율
}

// ============================================================================
// 해외주식 순위 타입
// ============================================================================

/**
 * 해외주식 시세분석 공통응답
 * Output1에 사용됨
 */
export interface KISOverseasTrendOutput {
  zdiv: string; // 소수점 자리수
  stat: string; // 거래상태
  nrec: string; // RecordCount
}

/**
 * 해외주식 가격급등락 응답
 * API: /uapi/overseas-stock/v1/ranking/price-fluct
 */
export interface KISOverseasPriceFluctOutput {
  rsym: string; // 실시간조회심볼
  excd: string; // 거래소코드
  symb: string; // 종목코드
  knam: string; // 종목명
  last: string; // 현재가
  sign: string; // 기호
  diff: string; // 대비
  rate: string; // 등락율
  tvol: string; // 거래량
  pask: string; // 매도호가
  pbid: string; // 매수호가
  n_base: string; // 기준가격
  n_diff: string; // 기준가격대비
  n_rate: string; // 기준가격대비율
  enam: string; // 영문종목명
  e_ordyn: string; // 매매가능
}

/**
 * 해외주식 거래량급증 응답
 * API: /uapi/overseas-stock/v1/ranking/volume-surge
 */
export interface KISOverseasVolumeSurgeOutput {
  rsym: string; // 실시간조회심볼
  excd: string; // 거래소코드
  symb: string; // 종목코드
  knam: string; // 종목명
  last: string; // 현재가
  sign: string; // 기호
  diff: string; // 대비
  rate: string; // 등락율
  tvol: string; // 거래량
  pask: string; // 매도호가
  pbid: string; // 매수호가
  n_tvol: string; // 기준거래량
  n_diff: string; // 증가량
  n_rate: string; // 증가율
  enam: string; // 영문종목명
  e_ordyn: string; // 매매가능
}

/**
 * 해외뉴스 응답
 * API: /uapi/overseas-price/v1/quotations/news-title
 */
export interface KISOverseasNewsOutput {
  info_gb: string; // 뉴스구분
  news_key: string; // 뉴스키
  data_dt: string; // 조회일자
  data_tm: string; // 조회시간
  class_cd: string; // 중분류
  class_name: string; // 중분류명
  source: string; // 자료원
  nation_cd: string; // 국가코드
  exchange_cd: string; // 거래소코드
  symb: string; // 종목코드
  symb_name: string; // 종목명
  title: string; // 제목
}

// ============================================================================
// 휴장일 조회 타입
// ============================================================================

/**
 * 국내 주식 휴장일 조회 응답
 * API: /uapi/domestic-stock/v1/quotations/chk-holiday
 * tr_id: CTCA0903R
 */
export interface KISHolidayOutput {
  bass_dt: string; // 기준일자 (YYYYMMDD)
  wday_dvsn_cd: string; // 요일구분코드 (01:일 ~ 07:토)
  bzdy_yn: string; // 영업일여부 (Y/N)
  tr_day_yn: string; // 거래일여부 (Y/N)
  opnd_yn: string; // 개장일여부 (Y/N)
  sttl_day_yn: string; // 결제일여부 (Y/N)
}

/**
 * 휴장일 캐시 데이터 (system_config 저장용)
 */
export interface MarketHolidayCache {
  holidays: MarketHolidayItem[];
  syncedAt: string; // ISO8601
}

/**
 * 휴장일 항목
 */
export interface MarketHolidayItem {
  date: string; // YYYYMMDD
  dayOfWeek: string; // 요일 (월, 화, ...)
}
