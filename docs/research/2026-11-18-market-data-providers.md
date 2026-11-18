# 시세·환율 공급원 조사

조사일: 2026-11-18 · 티켓: [시세 데이터 공급원 선택: 종목·현재가·종가 백필·배당·환율](https://github.com/Gn0lee/oat/issues/528) · 결과를 쓴 곳: [시세 데이터 공급원](../design/market-data.md)

표기: **[1차]**는 원문(약관 원문, 공식 페이지, 공식 GitHub 저장소 코드, 직접 호출)에서 확인한 것이고, **[2차]**는 검색 요약·블로그·제3자 자료로만 본 것이에요.

## 결론

- 공개 서비스 구조에서 다른 사용자에게 시세를 보여줄 수 있는 **무료·합법 경로는 국내·미국 모두 없어요.** 무료 플랜은 개인 또는 사내 내부용이에요.
- KIS는 기술적으로 충분해요(초당 20건, 국내 일봉 원주가 선택, 미국 무료 실시간, 배당 일정). 하지만 고객 약관이 "개인의 업무 한정, 제3자 제공 금지"예요.
- 국내 시세는 data.go.kr(공공누리 4유형: 출처표시·비상업·변경금지)이 비상업 단계에서 가장 깨끗하지만, 종가만 있고 다음 영업일 13시 이후에 올라와요.
- 환율은 한국은행 ECOS `731Y001`이 서울외국환중개 매매기준율을 1964년부터 무료로 줘요. "그날 마지막 고시"(은행 회차별 고시)는 공식 API가 없어요.

## 1. KIS Open API

| 항목 | 내용 | 근거 |
|---|---|---|
| 제3자 제공 | 고객 약관 제5조 ③ "시세 … 정보를 고객이 직접 개발한 프로그램 등 개인의 업무에 한하여 이용해야 하며, 제3자에게 제공해서는 아니 된다." 제5조 ② 앱키 대여·양도 금지. 제2조 2호 "고객"은 계좌 보유자 | [1차] [고객 약관](https://apiportal.koreainvestment.com/api/terms/public?termsType=MARKET) |
| 제휴 | 제휴기관 약관 제5조 ⑦ 시세는 거래고객 대상 서비스에 한해 허용, 제7조 ② 사업자등록증·인감증명서. 시세 표시에는 KRX·코스콤 정보이용계약 필요 | [1차] [제휴기관 약관](https://apiportal.koreainvestment.com/api/terms/public?termsType=AGENCY), [2차] [제휴 안내](https://apiportal.koreainvestment.com/provider) |
| 호출 한도 | 실전 REST 초당 20건. 토큰 1일 유효, 6시간 안 재요청은 같은 토큰, 발급마다 알림톡, 재발급 1분 1회. 일일 한도는 찾지 못함 | [1차] `koreainvestment/open-trading-api`의 `kis_auth.py` 주석·README |
| 국내 일봉 | `FHKST03010100` 1회 최대 100건, `FID_ORG_ADJ_PRC` 0 수정주가 / 1 원주가 | [1차] `examples_llm/domestic_stock/inquire_daily_itemchartprice/` |
| 해외 일봉 | `HHDFS76240000` 기준일 `BYMD`부터 과거로, `MODP` 0 미반영 / 1 반영, 출력 `xymd`·`clos`. 1회 건수·최대 과거 범위는 미확인 | [1차] `overseas_stock/dailyprice/`, [2차] [AlgoLab](https://algolab.co.kr/blog/kis-overseas-dailyprice-hhdfs76240000-2026) |
| 상장폐지 | 해외 마스터에 폐지 칸 없음, 국내 마스터는 거래정지·정리매매·관리종목 플래그만. 폐지일은 상품기본정보(`lstg_abol_dt`)로 조회 가능. 폐지 종목의 과거 시세가 나오는지는 미확인 | [1차] `stocks_info/` 파서 |
| 해외 마스터 칼럼 | ISIN 칼럼 없음(Symbol, 한글명, 영문명, 증권유형, 통화 등) | [1차] `stocks_info/overseas_stock_code.py` |
| 국내 배당 | `HHKDB669102C0`: `record_date`, `per_sto_divi_amt`, `divi_rate`, `divi_pay_dt`, `divi_kind` 등. 배당락일·예정/확정 칸 없음 | [1차] `chk_ksdinfo_dividend.py` |
| 해외 배당 | `CTRGT011R`: `acpl_bass_dt`(현지기준일), `stkp_dvdn_frcr_amt2~4`, `crcy_cd`, `dfnt_yn`(확정여부, "예정"은 변경될 수 있음). 권리유형 03 배당·75 특별배당 | [1차] `overseas_stock/period_rights/` |
| 연속 조회 | 공식 예제가 `max_depth=10`으로 끊음 → 긴 기간은 조용히 잘림 | [1차] |
| 미국 시세 지연 | "미국 - 실시간무료(0분지연)". 웹소켓 문서 기준이고 REST `price`는 명시 없음 | [1차] `overseas_stock/delayed_ccnl/` |

## 2. 국내 대안

| 후보 | 내용 | 근거 |
|---|---|---|
| data.go.kr 금융위원회_주식시세정보·증권상품시세정보 | 공공누리 제4유형(출처표시·상업적 이용금지·변경금지), 상업 이용은 KRX Data Marketplace 유료. 하루 1회, 기준일 다음 영업일 13시 이후. 개발계정 10,000건. 제공 시작일과 폐지 종목 포함 여부는 미확인(`basDt` 조회라 그날 상장 종목은 나올 것으로 추정) | [1차] [주식시세](https://www.data.go.kr/data/15094808/openapi.do), [증권상품시세](https://www.data.go.kr/data/15094806/openapi.do) |
| data.go.kr 금융위원회_KRX상장종목정보 | 상세는 공공누리 4유형, 카탈로그 JSON은 "제한 없음"으로 서로 다름. 폐지 여부 칸 없음 | [1차] [상세](https://www.data.go.kr/data/15094775/openapi.do), [2차] 카탈로그 |
| data.go.kr 주식배당정보·주식권리일정정보(예탁원) | 공공누리 제2유형(출처표시·상업적 이용금지). 배당기준일·현금배당지급일·주당배당금. 확정/예상·배당락일 칸 없음 | [1차] [배당정보](https://www.data.go.kr/data/15043284/openapi.do), [권리일정](https://www.data.go.kr/data/15059609/openapi.do) |
| KRX 정보데이터시스템 Open API | 2010-01-04부터(ETN 2014-11-17). 비상업 목적 한정(제6조), 제3자 제공 금지(제11조), 키당 하루 10,000회, 출처 표시 | [1차] [서비스](https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd), [약관](https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO002.jsp) |

## 3. 미국 대안

| 공급원 | 가격·한도 | 폐지 종목 | 앱 사용자에게 표시 | 근거 |
|---|---|---|---|---|
| Tiingo | 무료 시간당 50·하루 1,000, Power $30, Business $50 | supported_tickers의 endDate로 추정 [2차] | 공개 플랜은 모두 내부용. 재배포 스타트업 약 $250/월(조건 불명확) | [1차] [가격](https://www.tiingo.com/about/pricing) |
| EODHD | EOD $19.99, EOD+장중 $29.99 | 모든 패키지에 포함, `delisted=1` | 내부용 $399/월도 표시 불가, Enterprise $2,499/월 | [1차] [가격](https://eodhd.com/pricing), [상업](https://eodhd.com/commercial-pricing), [폐지](https://eodhd.com/financial-academy/financial-faq/historical-stock-prices-for-delisted-companies) |
| Massive(구 Polygon) | Advanced $199(개인) | 미확인 | 본인 외 누가 보든 Business($2,499/월, 스타트업 할인) | [1차] [안내](https://massive.com/knowledge-base/article/which-plan-do-i-need-to-show-massive-data-in-my-app) |
| FMP | $22~$59 [2차] | Premium부터 [2차] | 별도 표시 계약 [2차] | 원문 403 |
| Alpha Vantage | 무료 하루 25회, $49.99~ | 미확인 | 개인·비상업 [2차] | [1차] [premium](https://www.alphavantage.co/premium/) |
| Twelve Data | 무료 하루 800, $29~ | 미확인 | 표시하려면 해당 tier나 재배포 애드온 | [1차] [terms](https://twelvedata.com/terms) |
| Yahoo(비공식) | — | — | 수익 창출 금지, 24시간 안 삭제 요구. 출시 앱에 쓸 수 없음 | [1차] [Yahoo API 약관](https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html) |

- 재사용된 티커는 ISIN 등으로 매핑해야 한다는 것이 흔한 함정이에요 [2차] [EODHD 포럼](https://forum.eodhd.com/t/tips-for-handling-delisted-tickers-in-historical-data/909).

## 4. USD/KRW 환율

| 출처 | 값 | 고시 시점 | 과거 | 한도 | 이용 조건 | 근거 |
|---|---|---|---|---|---|---|
| 한국은행 ECOS `731Y001`/`0000001` | 원/미국달러 매매기준율(출처기관 서울외국환중개) | 영업일 단위, 주말 행 없음, 2026-11-18 값까지 반영 | 1964-05-04부터 17,550건 | 공식 수치 미확인(300회/3분 자료 [2차]) | 상업 이용·출처 원문 미확인 | [1차] sample 키로 직접 호출 |
| 수출입은행 AP01 | `deal_bas_r`(수은), `ttb`·`tts`, `kftc_deal_bas_r`(서울외국환중개) | 영업일 11시 전후, 휴일·11시 전은 null | `searchdate` 지원, 범위 미확인 | 하루 1,000회 | 공공누리(유형 미판별), data.go.kr "제한 없음". 도메인 `oapi.koreaexim.go.kr`로 변경 | [1차] [API 명세](https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C) |
| 서울외국환중개(smbs.biz) | MAR 원본 | 08시 | — | 공개 API 없음 | — | [2차] |
| 하나은행 등 은행 고시 | 회차별 매매기준율(하루 여러 회) | — | 조회 페이지 | 공개 API 없음(기업용 HANA FX) | 스크래핑 허용 근거 없음 | [2차] |
| ExchangeRate-API | 여러 출처 혼합 중간값 | Pro 60분 | Pro($10/월) 이상 1990년부터 | Pro 3만/월 | 거래·정산용 금지 | [1차] [문서](https://www.exchangerate-api.com/docs/historical-data-requests) |
| Frankfurter | ECB 등 중앙은행 참고환율, KRW 지원, 주말 요청은 직전 값 | 하루 1~수 회 | 1948년부터 | 없음 | 상업 무료 | [1차] [frankfurter.dev](https://frankfurter.dev/) |

- 서울외국환중개 매매기준율은 전 영업일 현물환 거래의 거래량 가중평균이고 영업일 아침에 한 번 고시돼요. 은행들은 이 값을 1회차 고시로 쓰고 이후 회차는 시장을 따라 고쳐요 [2차] [뉴스토마토](https://www.newstomato.com/ReadNews.aspx?no=1212928).
- 매매기준율 산정을 시간가중평균(TWAP)으로 바꾸는 외국환거래규정 개정안이 2027-01-01 시행 예정으로 행정예고됐어요 [1차] [국민참여입법센터](https://opinion.lawmaking.go.kr/gcom/admpp/46878). 2026-07-06부터 원/달러는 24시간 거래돼요 [2차] [파이낸셜뉴스](https://www.fnnews.com/news/202607050652161806).

## 5. 지금 oat가 쓰는 방식(이 레포 코드)

- 종목 마스터: `scripts/sync-stock-master.ts`가 KIS 마스터파일 5개(zip)를 받아 `stock_master`에 `(market, code)`로 UPSERT해요. 지우지 않아서 폐지 종목 행도 남아요. `.github/workflows/sync-stock-master.yml`이 매일 23:00 UTC(08:00 KST)에 돌려요.
- 현재가: `lib/api/stock-price.ts`가 사용자 요청 중에 KIS를 불러요(국내 `intstock-multprice` 30개 묶음, 해외 `quotations/price` 종목당 1건). `stock_prices`에 1시간 버킷 캐시를 두고, 2초 안에 못 받으면 옛 값을 써요.
- 환율: `scripts/sync-exchange-rates.ts`가 2시간마다 ExchangeRate-API `latest/USD`를 불러 `exchange_rates`의 한 행을 덮어써요. 이력이 없어요.
- 휴장일: `scripts/sync-holiday.ts`가 KIS `chk-holiday`를 주 1회 불러요.
- KIS 토큰은 DB에 저장해 재사용해요(`lib/kis/client.ts`).
