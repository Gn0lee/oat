# 정식 출시 조건 목록

- 결정일: 2026-11-26
- 티켓: [정식 출시 조건 목록: 계정·로그인·계약·법무·스토어 심사·품질 기준](https://github.com/Gn0lee/oat/issues/539)
- 관련 ADR: 0037(정식 출시는 iOS App Store 한국 공개 + 공개 가입, 개인 판매자), 0038(정식 출시 시세는 종가, 표시 권리는 서면으로), 0019(초대제 동안 KIS), 0020(그날 기준환율), 0021(브랜드·도메인), 0022(인증), 0023(MCP), 0024(나가기·계정 삭제)
- 조사: [정식 출시 조건 조사](../research/2026-11-26-launch-conditions.md)(스토어 정책·계정 종류·국내 법·시세 공급원)
- 리뷰: 독립 리뷰어(Fable 5.2)가 한 번 검토했어요. 환율·종목 마스터 출처, 문의 메일의 범위(과거 종가·원주가·종목 수), 장중 시세 전제 화면 규칙, 국내 문의의 완료 기준, 실제 지연 시간, KIS 출처 종가 정리, 소셜 계정 삭제, Cloudflare·접속 로그 고지, 동의·랜딩 구현, 공개 가입 운영, 심사용 가구 유지, 사업자등록 근거, 근거보다 센 표현, ADR 되돌림 표시를 반영했어요.
- 이 문서는 **목록·순서·완료 기준**만 정한다. 실행(문의·등록·실기기 점검·제출)은 지도 밖에서 한다. 앱·서버 기능은 구현 티켓으로 간다.

## 1. 한 장 요약

| 항목 | 결정 |
|---|---|
| 정식 출시 | **iOS App Store 한국 공개 + 공개 가입.** 누구나 가입하고, 가구는 직접 만들거나 초대를 받아 들어간다. 초대 코드로 가입을 막지 않는다(Apple 3.2.2(v) "쓸 사람을 임의로 제한"에 걸릴 위험, 2.5.19 숨긴 기능) |
| Android | iOS 정식 출시 **뒤** 이식하고 따로 출시한다. iOS 출시를 막지 않는다(8절) |
| 판매자 | Apple **개인** 계정(본인 실명). 법인·조직 계정은 금융 앱 조항으로 끝내 막힐 때의 비상구 |
| 사업자등록 | **무료 사용을 확인한 뒤, 필요할 때만.** 필요한 경우는 App Store Connect 한국 규정 준수 정보에 사업자번호가 필수일 때, 허락받은 공급원이 유료·계약을 요구할 때, 유료화·광고를 시작할 때. 등록 전에 회사 겸직 규정을 확인한다 |
| 상표 | **KIPRIS 검색에서 충돌 없음**이 조건이다. 출원은 선택이고 출시를 막지 않는다 |
| 시세 | **국내·미국 보유 종목을 모두 종가로 평가할 수 있고, 종가·종목 목록·환율을 보여줄 권리를 서면으로 확보한다.** 국내는 data.go.kr(무료·광고 없음인 동안, 최대 다음 영업일 오후까지 늦음), 미국은 Alpha Vantage 무료 허락 → marketstack Basic 순서로 문의. 장중 시세는 조건이 아니다(4절) |
| AI 연결 | 허용 목록 유지, ChatGPT 개인 계정 연결 확인, 외부 AI 고지를 동의 화면·앱 AI 연결 화면·처리방침 세 곳에, 가구 참여 때 한 줄 고지, 원시 시세를 내주지 않음(5절) |
| 품질 | 접근성 라벨 4개(VoiceOver·더 큰 텍스트·다크·색에만 의존하지 않음)와 콜드 스타트 두 줄. 라벨은 지금 Apple에서 선택이지만 우리 출시 조건이다(6절) |
| 운영 | 백업 복구 리허설, 로그 보관, 유출 대응 절차, 문의 창구와 장애 공지, 공개 가입 보호(속도 제한·가입 중지 스위치·한도 경보), 심사용 가구(7절) |
| 필요 없음 | 부가통신사업 신고, 통신판매업 신고, 유사투자자문 신고, 위치정보·전자금융·마이데이터 관련 등록(10절) |

## 2. 정식 출시의 정의

```
초대제                      iOS 정식 출시                     Android 출시
TestFlight 내부 테스트  →   App Store 한국 공개           →   Play 비공개 테스트 12명·14일
우리 가구만                 누구나 가입                       → Play 프로덕션
이메일 로그인               Apple·Google 로그인 추가
KIS 시세(회색지대)          표시 권리 있는 종가
```

- **초대제**: 전환한 가구만 TestFlight 내부 테스트로 쓴다([전환 당일 절차](cutover.md)). 스토어 심사가 없다.
- **정식 출시**: 이 문서의 조건을 모두 넘고 App Store에 한국 한정으로 공개한다. 가입은 누구나 할 수 있고, 가구 초대는 가입한 뒤 쓰는 기능이다. 심사원이 비밀 경로 없이 앱 전체를 볼 수 있어야 한다. 초대 전용 가입을 직접 다룬 Apple 조항은 없지만(공식 입장 미확인) 위험을 피한다.
- **Android 출시**: 정식 출시 뒤 이식한다. 공개 가입자 중에서 Play 비공개 테스터 12명을 모은다.
- 지도의 도착점은 iOS 정식 출시 조건과 구현 티켓 묶음이다.

## 3. 순서와 완료 기준

오래 걸리는 일(문의 답 기다리기)을 먼저 시작하고, 나머지는 함께 진행한다. 각 항목의 **완료 기준**을 넘어야 그 항목에 기대는 다음 일을 시작한다.

### 3.0 전환 전 (이미 정함)

| 항목 | 완료 기준 | 출처 |
|---|---|---|
| 유료 Apple 개발자 계정(개인) | 가입 완료, 판매자 이름 = 본인 실명 | [전환 당일 절차](cutover.md) 2절 |
| 도메인 oatday | 구매, Cloudflare Tunnel 공개 주소 연결 | [브랜드](brand.md), 전환 당일 절차 2절 |

### 3.1 1단계: 초대제 시작 직후

순서: ① 문의·검색·확인을 한꺼번에 시작 → ② 답이 모이면 공급원과 사업자등록 필요 여부를 판단 → ③ 필요할 때만 겸직 확인 → 사업자등록.

| 항목 | 완료 기준 |
|---|---|
| 국내 시세 비상업 해석 문의 | 금융위원회(data.go.kr 제공기관)에 부록 A의 문의를 **개인 이름으로** 보내고, ① 무료·광고 없는 앱이 공공누리 4유형의 "비상업"이다 ② 보유 수량을 곱한 평가액 표시가 "변경 금지"에 걸리지 않는다 ③ 종목 목록·예탁원 배당정보(2유형)도 같다는 **긍정 답**을 받아 보관. 4주 안에 답이 없거나 모호하면 공공데이터 활용지원센터에 다시 묻고, 그래도 안 되면 국내 대안(Twelve Data 한국 표시 승인, 코스콤 옵션 3 견적)으로 판단한다 |
| 환율 이용 조건 확인 | ECOS(한국은행)와 수출입은행 환율 API의 약관 원문에서 앱 사용자 표시·출처 표시 조건을 확인. 원문으로 불명확하면 문의하고 답을 보관(ADR 0020) |
| 미국 시세 표시 허락 문의 | Alpha Vantage(무료 허락) → marketstack Basic(월 $9.99) 순서로 부록 A의 문의. 허락 범위가 **전일 종가 + 과거 일별 종가 백필 + 원주가(수정 전) + 종목 목록·상장 상태 + 저장 후 재표시 + 종목·요청 수 증가**를 모두 포함하는 서면 답을 받아 보관. Alpha Vantage 무료 한도(하루 25회 수준, 문의 전에 현재 값 확인)로는 부족하므로 한도 상향도 함께 묻는다 |
| 상표 검색 | KIPRIS에서 "oat"·"오트"(문자)와 로고(도형)의 9·36·42류 선행 등록·출원을 검색해 사용을 막는 권리가 없음을 기록. 42류 디자인업 "OAT"(4020260186453)는 지정상품을 확인 |
| 상표 출원(선택) | 하면 "oat" 9·36·42류 고시명칭 전자출원(약 14만 원). 출시를 막지 않음 |
| 사업자번호 필수 여부 확인 | App Store Connect의 비즈니스 → 계약 → 규정 준수 → 대한민국 법률 화면에서 사업자등록번호 칸이 필수인지 확인해 기록 |
| 공급원 판단 | 위 답이 모이면 국내·미국 공급원을 정해 [시세 데이터 공급원](market-data.md)에 적는다. 모두 "안 됨"이면 사용자 직접 입력과 유료 공급원(Twelve Data Venture 월 $124~, Tiingo 재배포 월 $250) 중에서 다시 정한다 |
| 겸직 확인(필요할 때) | 사업자등록이 필요하다고 판단되면 취업규칙 겸직 조항 확인, 승인·신고가 필요하면 받음. 막히면 대안(배우자 명의 등)을 그때 판단 |
| 간이과세 개인사업자 등록(필요할 때) | 사업자등록증 발급. 필요하지 않으면 유료화·광고 시작 때로 미룬다 |

- 사업자 신분은 공공누리 "비상업" 판단에 불리할 수 있어서 국내 문의는 등록 전에 보낸다.

### 3.2 2단계: 구현 기간 (앱·서버 기능)

구현 티켓으로 가는 항목이다. 완료 기준은 구현 티켓의 수용 기준이 된다.

**가입·계정**

| 항목 | 완료 기준 | 출처 |
|---|---|---|
| 공개 가입 | 초대 없이 가입 → 가구 만들기 또는 초대 수락. 심사원이 데모 계정으로 모든 기능에 닿음 | 2절 |
| 약관·처리방침 동의 | 이메일·Apple·Google 가입 경로 모두에서 이용약관·처리방침 동의와 만 14세 이상 확인. 동의한 문서 버전·시각을 저장. 전환한 가구의 기존 계정은 첫 실행 때 한 번 동의를 받음 | 9절 |
| 만 14세 이상 확인 | 위 동의 화면에서 확인, 확인 시각 저장. 14세 미만은 가입 불가(법정대리인 동의 절차를 두지 않음) | 개인정보보호법 22조의2 |
| Apple·Google 로그인 | 네이티브 ID 토큰으로 둘 다 추가(Google을 넣으면 Apple 필수, 4.8). Apple 이메일은 첫 로그인 때만 옴 | [인증](auth.md) |
| Apple 토큰 철회 | 로그인 때 refresh token 저장, 계정 삭제 때 `POST https://appleid.apple.com/auth/revoke`. 실패하면 worker가 다시 시도. **Apple로 가입한 계정을 지워 revoke 200을 확인** | [가구원 나가기·계정 삭제](member-leave.md) |
| Apple 서버 알림 | 한국 개발자에게 요구되는 Sign in with Apple server-to-server 알림 엔드포인트를 둔다. Services ID 없는 네이티브 방식에서 **어디에 등록하는지 먼저 확인**하고, 계정 삭제·이메일 변경 이벤트를 처리 | Apple 계정 삭제 안내 |
| 소셜 계정 삭제 확인 | 비밀번호가 없는 Apple·Google 가입자는 비밀번호 재입력 대신 Apple·Google 재인증으로 확인 | 가구원 나가기·계정 삭제 |
| 앱 안 링크 | 설정에 이용약관·처리방침·지원·데이터 출처 링크 | App Store 5.1.1(i) |

**시세·환율** (4절)

| 항목 | 완료 기준 |
|---|---|
| 공급원 교체 | 국내 data.go.kr 종가·종목·배당, 미국은 허락받은 공급원. KIS 현재가·종가·마스터 작업을 끈다. `LiveQuoteSource` 구현체가 없을 때 장중 현재가 없이 동작하는 테스트 |
| 종목 마스터 | 국내는 KRX상장종목정보, 미국은 허락받은 공급원의 종목 목록·상장 상태. 폐지 감지는 목록에서 사라진 날로 `listed = false`. 미국 한글 이름은 기존 값을 유지하고(3.1의 5) 새 종목은 영문명으로 보여주고 찾는다. 단가 칩은 보유 종목이면 최근 종가, 국내 비보유 종목이면 data.go.kr 전일 종가, 미국 비보유 종목이면 칩 없음 |
| KIS 출처 종가 정리 | 출시 전에 `security_daily_closes`의 KIS 출처 행을 허락받은 출처로 한 번 다시 받는다(3.1의 7 "덮어쓰지 않음"의 한 번 예외). 완료 기준은 `source = kis` 0건. 배당·마스터 칸도 같다 |
| 화면 규칙 | [통계 화면 구성](stats-screens.md) 7절을 종가 전제로 고친다: 기준 표기는 날짜만("11/25 종가 기준", "미국 11/24 종가"), [지연] 배지는 "그 시장의 최신 종가가 올라올 시각이 지났는데 아직 없음"에만, 출처 문구는 허락 조건대로 |
| 월말 평가 확정 | 월별 자산 추이의 그 달 평가는 그 달 마지막 거래일 종가가 들어온 뒤 확정된다(국내는 최대 다음 영업일 오후). 그 전에는 직전 종가로 보여준다 |

**AI 연결·운영·빌드**

| 항목 | 완료 기준 | 출처 |
|---|---|---|
| AI 연결 고지·동의 | 5절의 세 곳 고지와 가구 참여 고지 | 5절 |
| 로그 보관 | API 접속 로그 3개월 이상, 관리자 접속기록 1년 이상 | 7절 |
| 공개 가입 보호 | 가입·로그인·메일 발송 속도 제한, 운영자가 켜는 가입 중지 스위치 | 7절 |
| 푸시 운영 | APNs .p8 키(sandbox·production 전용으로 나눔), 기기 토큰마다 환경 저장, `410 Unregistered` 토큰 삭제 | [알림](notifications.md) |
| Privacy Manifest | `expo.ios.privacyManifests`에 정적 CocoaPods 이유를 옮김. TestFlight 업로드 뒤 경고 메일 없음. Google 로그인 라이브러리가 서명·manifest를 포함한 버전 | Apple 서드파티 SDK 요건 |
| 빌드 요건 | 제출 시점의 Apple 최소 Xcode·SDK 요건(2026-11 기준 Xcode 26·iOS 26 SDK), `ITSAppUsesNonExemptEncryption = NO`, iPad 지원 끔 | App Store 요건 |
| 웹 페이지 | 랜딩·이용약관·처리방침·지원 페이지를 **미니 PC 밖 정적 호스팅**에 둔다(심사 중 서버가 멈춰도 URL이 살아 있게) | 7절 |

### 3.3 3단계: 출시 직전

**문서·법무** (9절, 웹에 게시하고 앱 안에서 링크)

| 항목 | 완료 기준 |
|---|---|
| 개인정보처리방침 | 9.1의 항목을 모두 담아 게시. 앱 안·App Store 메타데이터 양쪽에 링크 |
| 이용약관 | 9.2의 조항을 담아 게시 |
| 지원 페이지 | 문의 이메일과 장애 공지 위치가 있는 지원 URL |
| 권리 증빙 | 3.1의 서면 답(국내·환율·미국)을 한곳에 보관(심사 5.2.2 요청 대비) |

**품질** (6절)

| 항목 | 완료 기준 |
|---|---|
| 접근성 라벨 4개 | 6절의 점검을 모두 통과하고 App Store Connect에 표시 |
| 콜드 스타트 | iPhone SE 2세대, Release 빌드, 재부팅 뒤 콜드 실행 10회 중간값: 홈 숫자 보임 1.5초 이하, 빠른 동작 키패드 1.5초 이하([모바일 입력 UX 원칙](mobile-input.md) 12절) |
| 실기기 푸시 | 개발 빌드(sandbox)와 TestFlight 빌드(production)에서 각각 실제 수신 확인. 잠금화면 문구가 [알림](notifications.md) 규칙(4.5.4 민감 정보 없음)대로 |
| AI 연결 | 허용 목록의 클라이언트로 실제 연결. ChatGPT 개인 계정 포함 |

**운영** (7절)

| 항목 | 완료 기준 |
|---|---|
| 백업 복구 리허설 | HDD·S3 백업 각각에서 빈 DB로 복구해 최근 기록이 보임 |
| 유출 대응 절차 | 문서 한 장(9.3) |
| 심사용 가구 | 7절의 조건을 갖춤. 제출 직전에 복원 스크립트를 돌림 |
| 경보 | 메일 발송 한도·시세 공급원 호출 한도 80% 경보가 운영자에게 옴 |

**스토어 제출**

| 항목 | 완료 기준 |
|---|---|
| 배포 국가 | 한국만. EU DSA는 비 trader로 선언 |
| 한국 규정 준수 | 이메일 입력. 사업자번호는 3.1에서 필수로 확인된 경우에만 입력(그러면 그 전에 등록) |
| 이름·부제·키워드 | 이름 30자, 부제 30자, 키워드 100바이트(한글 약 33자). "기록"·"가계부"·"평가액" 중심, "투자 관리"·"자산 운용" 피함 |
| App Privacy 라벨 | Contact Info, Financial Info(Other Financial Info), User Content, Identifiers, Diagnostics(오류 추적, 그리고 콜드 스타트 표식을 서버로 보내므로 Performance Data). 모두 Linked, Tracking 없음 |
| 연령 등급 | 새 질문(13+/16+/18+ 체계)에 답함 |
| 스크린샷 | iPhone Dynamic Island 중간 크기(1179×2556 또는 1206×2622) 최소 1장 |
| 심사 메모 | 부록 B 문구 + 데모 계정 2개(같은 가구) |
| 접근성 라벨 | 4개 표시 |

## 4. 시세

ADR 0038. [시세 데이터 공급원](market-data.md)의 "정식 출시 전 표시 라이선스 공급원으로 교체"(ADR 0019)를 구체화한다.

- **출시 조건은 종가다.** 월별 자산 추이와 평가액은 종가로 계산된다. 장중 현재가는 허락받은 공급원이 주면 덤으로 쓰고, 없으면 쓰지 않는다. 초대제의 KIS 장중 현재가(1분)는 정식 출시 전에 끈다.
- **국내: data.go.kr.** 금융위원회 주식시세·증권상품시세(종가), KRX상장종목정보(종목), 예탁원 배당정보. 공공누리 4·2유형이라 **무료·광고 없음**인 동안만 쓴다. 기준일 다음 영업일 13시 이후에 올라와서 평가가 **최대 다음 영업일 오후까지** 늦는다(금요일 종가는 월요일 오후, 연휴는 더 길다). 유료화나 광고를 시작하면 바꾼다(후보: Twelve Data 한국 표시 승인, 코스콤 옵션 3).
- **미국: 서면 허락을 받은 공급원.** 무료로 앱 사용자 표시를 허락하는 미국 종가 출처는 없다([조사](../research/2026-11-26-launch-conditions.md) 7.5). Alpha Vantage 무료 허락 → marketstack Basic(월 $9.99) 순서로 묻는다. 허락 범위는 전일 종가, 과거 일별 종가 백필, 원주가(수정주가만 주면 쓸 수 없음, 시세 데이터 공급원 3.1의 3), 종목 목록·상장 상태, 저장 후 재표시, 종목·요청 수 증가를 모두 포함해야 한다. 미국 배당을 그 공급원이 주지 않으면 배당 일정은 사용자 기록으로만 둔다.
- **환율: ECOS(한국은행), 교차 검증은 수출입은행**(ADR 0020). 약관 원문의 표시·출처 조건을 확인한다.
- **긁어오지 않는다.** 가격 숫자에는 저작권이 없지만 API 약관(계약), 데이터베이스 보호(저작권법 93조), 부정경쟁방지법 데이터 조항, Apple 5.2.2(제3자 콘텐츠 권리 증빙)에 걸린다.
- **AI 연결은 원시 시세를 내주지 않는다.** MCP에 종목별 현재가·종가 목록 툴을 두지 않는다. `get_holdings`의 평가액·수익률은 그대로다. 공급원 문의 때 "원시 데이터를 재배포하지 않음"을 조건으로 적는다.

## 5. AI 연결

- **허용 목록 유지**: 확인한 클라이언트(Claude, ChatGPT·Codex, Hermes)의 CIMD만 받는다(ADR 0023). 요청이 오면 하나씩 확인해서 더한다.
- **ChatGPT 개인 계정 연결 확인**을 출시 전에 한다([MCP](mcp.md) 8절).
- **고지 세 곳**(Apple 5.1.2(i) "including with third-party AI", 개인정보보호법 28조의8)
  1. 서버 동의 화면(`/oauth/consent`): "조회만 허락" 위에 무엇이 어디로 가는지와 언제든 앱에서 끊을 수 있다는 것. 문구는 클라이언트마다 다르다. 회사가 운영하는 클라이언트(Claude·ChatGPT·Codex)는 회사 이름과 나라, 사용자가 직접 띄우는 클라이언트(Hermes)는 "이 앱을 실행하는 곳(당신이 정한 서버)과 그 앱이 쓰는 AI 서비스"로 적는다.
  2. 앱의 설정 → AI 연결 화면: 같은 고지(심사원이 앱 안에서 봄).
  3. 개인정보처리방침의 별도 항목(국외 이전 다섯 항목).
- **가구 참여 때 한 줄 고지**: "가구원이 AI 연결을 쓰면 공용 기록이 그 AI 서비스로 전달될 수 있어요." 가구 단위로 AI 연결을 막는 스위치는 두지 않는다(가구원 사이 갈등을 부르는 설정을 피함). 요청이 생기면 더한다.

## 6. 품질 기준

App Store 접근성 라벨은 2026-11 현재 선택 사항이지만 우리는 4개를 출시 조건으로 둔다. "공통 작업"은 로그인·온보딩·입력·조회·설정이다.

| 라벨 | 점검 |
|---|---|
| VoiceOver | 공통 작업을 VoiceOver만으로 끝까지. 키패드 키 이름과 금액 낭독, 퍼널 단계 이동 시 질문으로 포커스, 시트 포커스 가둠·두 손가락 문지르기 닫기, 토스트 낭독, 홈 편집 커스텀 액션([모바일 입력 UX 원칙](mobile-input.md) 11.1) |
| 더 큰 텍스트 | 200%와 AX 크기에서 본문이 겹치거나 잘리지 않음. 아래 다섯 가지를 실기기로 확인 |
| 다크 | 공통 작업 모든 화면을 시스템 다크로. 흰 화면 번쩍임 없음(시작 화면·웹 동의 화면·시트 포함) |
| 색에만 의존하지 않음 | 흑백 필터에서 손익 부호, 개인 장부 🔒, 자동 줄 아이콘, 선택 칩 ✓, 차트 라벨이 구분됨 |

더 큰 텍스트 실기기 확인([디자인 토큰](DESIGN.md), [화면 문법](screen-grammar.md)):
1. **큰 숫자 넘침**: `amount-hero` 최대 44pt, 넘치면 0.7배까지 줄이고, 그래도 넘치면 쉼표에서 두 줄. "먼저 줄이고 그다음 두 줄" 순서가 실제로 나오는지(필요하면 `onTextLayout`으로 고름). 확인 뒤 DESIGN.md의 "초안" 표시를 뗀다.
2. **키패드 상한**: 키 높이 고정, 글자 `maxFontSizeMultiplier` 상한이 200% 라벨 기준과 부딪히지 않는지(키패드는 컨트롤이라 본문 기준 밖이라고 보지만 실기기로 판단).
3. **목록 줄 AX 배치**: AX1 이상에서 금액이 이름 아래로 내려감.
4. **알약·칩 최소 높이**: 높이가 최소값이라 글자와 함께 커지고 잘리지 않음.
5. **탭 바**: 라벨은 키우지 않고 길게 누르면 큰 콘텐츠 보기(Large Content Viewer)가 뜸.

## 7. 운영 기준

- **백업 복구 리허설 1회**: 출시 전에 HDD와 S3 백업 각각에서 복구한다. 이후는 분기마다([셀프호스팅 운영 조사](../research/2026-11-11-self-hosting-ops.md)).
- **로그 보관**: API 접속 로그(시각·IP·사용자 id·경로, 본문 제외) 3개월 이상(통신비밀보호법 시행령 41조 대비, 해당 여부는 해석의 여지가 있어 보수적으로). 관리자(운영자)의 DB·관리 도구 접속기록 1년 이상(개인정보 안전성 확보조치 기준 8조). 계정을 지운 뒤에도 이 기간 동안 남고, 처리방침에 근거와 기간을 적는다.
- **유출 대응 절차**: 9.3.
- **문의 창구와 장애 공지**: 지원 페이지와 이메일. 장애 공지 위치는 미니 PC 밖(정적 지원 페이지)에 둔다. 답장 시간 목표는 두지 않는다.
- **공개 가입 보호**: 가입·로그인·비밀번호 재설정·메일 발송에 속도 제한을 건다. 운영자가 켜는 **가입 중지 스위치**(켜면 새 가입만 막고 기존 사용자와 초대 수락은 그대로)를 둔다. 메일 발송 서비스 무료 한도와 시세 공급원 호출 한도의 80%에서 경보를 받는다. 추적 종목이 한도를 넘으면 보유 중인 종목의 최근 종가를 먼저 받고, 백필은 다음 날로 미룬다.
- **심사용 가구**: 운영 서버에 가구 하나, 메일 인증을 마친 계정 2개, 공용·개인 장부와 국내·미국 주식 샘플 기록. 심사원이 계정을 지울 수 있으므로 **복원 스크립트**로 제출 직전마다 되살린다. 이 가구는 아침 묶음 푸시와 운영 지표(사용자 수)에서 뺀다. 종목은 다른 가구와 겹치는 흔한 종목만 써서 추적 종목을 늘리지 않는다. 심사 중 Uptime Kuma 알림을 본다.

## 8. Android 출시 조건(추가분)

iOS 정식 출시 뒤에 시작한다.

| 항목 | 완료 기준 |
|---|---|
| 이식 | Android 빌드, Pretendard 굵기별 글꼴 이름 매핑([디자인 토큰](DESIGN.md)), 제출 시점 targetSdk 요건(2026-11 기준 36 이상) |
| 푸시 | FCM 프로젝트와 알림 채널 두 개([알림](notifications.md)). 처리방침 위탁 목록에 FCM 추가 |
| Play 개인 계정 | 25 USD. 본인 인증 |
| 비공개 테스트 | 테스터 12명이 14일 연속 참여. 공개 가입자 중에서 모음 |
| 계정 삭제 웹 링크 | 앱 없이 삭제를 요청할 수 있는 웹 페이지(앱·개발자 이름, 지워지는 것과 남는 것). Data safety에 입력 |
| Data safety | 처리방침 URL, 전송 암호화, 삭제 요청 |
| 금융 기능 신고서 | "My app doesn't provide any financial features"(직접 기록 도구). 등록정보 문구를 기록 중심으로 |
| 콘텐츠 등급·App access | IARC, 심사용 로그인 정보 |
| 실기기 | 접근성(TalkBack·글자 크기)과 콜드 스타트 기준은 이식 때 정한다 |

## 9. 법무 문서의 내용

### 9.1 개인정보처리방침

개인정보보호법 30조 항목과 2026-04 작성지침(생성형 AI 항목)을 따른다. 넣을 것:
- 처리 목적·항목·보유 기간, 파기 절차
- **공용 기록은 계정 삭제 뒤에도 가구에 남는다**는 것과 뼈대 기록을 남기는 이유(ADR 0024)
- **백업 35일**, 전환 보관본 90일
- **접속 로그**: 항목(시각·IP·사용자 id·경로), 3개월, 계정 삭제 뒤에도 그 기간 남는 근거
- **처리 위탁과 국외 이전**(28조의8 다섯 항목): Cloudflare(모든 API 트래픽이 지나고 TLS가 풀리는 곳), 메일 발송, 오류 추적(쓰면), 외부 백업 저장소, Apple·Google 로그인, APNs(Android는 FCM), 미국 시세 공급원(종목 코드만 보내면 개인정보가 아니므로 해당 없음을 확인)
- **AI 연결**: 사용자가 연결한 외부 AI 서비스로 데이터가 전달됨, 다른 가구원의 공용 기록 포함, 끊는 방법
- **기기 토큰 수집**과 자동 수집 장치, 거부 방법(알림 끄기)
- 만 14세 미만은 가입할 수 없음
- 정보주체 권리(내려받기·삭제)와 행사 방법, 보호책임자(운영자 본인)와 연락처
- 2026-09-11 시행 개정법 문구를 law.go.kr에서 다시 확인한다.

### 9.2 이용약관

- 시세는 지연되거나 틀릴 수 있고 투자 조언이 아님, 출처 표기
- 백업 35일과 경과실 책임 제한(고의·중과실 면책은 쓰지 않음)
- 서비스 변경·중단·종료의 사전 고지와 내 데이터 내려받기 기회
- 무료에서 유료로 바뀔 때의 고지
- 가구 공용 기록의 처리, 나가기·계정 삭제
- 외부 AI 사업자의 처리는 그 사업자 책임
- 이용 제한(가입 중지 포함), 분쟁 관할

### 9.3 유출 대응 절차

- 유출(가능성 포함)을 안 때부터 통지·신고 기한(2026-09-11 개정 기사 기준 72시간)과 신고 대상 요건을 **law.go.kr에서 확인해** 적는다.
- 통지 문구(무엇이, 언제, 어떻게, 피해를 줄이는 방법, 문의처), 보낼 경로(메일), 신고처
- 세션 전부 끊기·AI 연결 해지·키 교체의 순서

## 10. 필요 없거나 나중인 것

- **부가통신사업 신고**: 자본금 1억 원 이하는 신고한 것으로 본다(전기통신사업법 22조 5항, 시행령 30조).
- **통신판매업 신고**: 무료라 필요 없다. 유료화 때 간이과세자는 면제.
- **유사투자자문업 신고**: 사용자가 넣은 보유 내역·수익률·종가를 보여주는 것은 조언이 아니다. 종목 추천·매매 신호·AI 투자 의견을 앱이 직접 만들지 않는다.
- **위치정보·전자금융·마이데이터**: 해당 없음.
- **내부 관리계획**: 정보주체 1만 명 미만이면 생략할 수 있다.
- **카카오·네이버 로그인**: 요청을 보고 정한다([인증](auth.md)). 넣을 때 네이버 검수 요건과 카카오 Biz 앱(이메일, 사업자 정보 필요)을 확인한다.
- **법인·Apple 조직 계정**: 금융 앱 조항(3.2.1(viii)·5.1.1(ix))으로 끝내 막힐 때. 전환 중 몇 주 TestFlight 업로드가 막힐 수 있다.
- **상표 출원·변리사 선행조사**: 사용자가 늘거나 유료화할 때 다시 본다(ADR 0021의 출원 계획을 ADR 0037이 바꿈).

## 11. 넘어온 항목 대조

| 넘긴 곳 | 항목 | 이 문서 |
|---|---|---|
| [인증](auth.md) 6절 | 유료 Apple 계정, 도메인, Apple·Google 로그인, 계정 삭제 요건 | 3.0, 3.2 |
| [브랜드](brand.md) 5절, ADR 0021 | 도메인, 상표 출원(변리사 선행조사·로고 별도), 스토어 이름·부제·키워드 | 3.0, 3.1, 3.3, 10절 |
| [시세 데이터 공급원](market-data.md) 6·7절 | 표시 라이선스 공급원 계약, 정식 출시용 공급원 조건 | 4절, 3.1, 3.2 |
| ADR 0020 | ECOS 약관의 상업 이용·출처 표시 조건 확인 | 3.1 |
| [통계 화면 구성](stats-screens.md) 10절 | 데이터 출처 표시 문구 교체 | 3.2(화면 규칙) |
| [MCP](mcp.md) 8절 | 허용 목록, ChatGPT 개인 계정, 처리방침 AI 문구 | 5절 |
| [가구원 나가기·계정 삭제](member-leave.md) 13절 | 처리방침(공용 기록·뼈대·백업 35일·AI), Apple 토큰 철회, 통신비밀보호법 | 9.1, 3.2, 7절 |
| [알림](notifications.md) 11절 | APNs 키, 실기기 푸시, 기기 토큰 고지, FCM·채널 | 3.2, 3.3, 9.1, 8절 |
| [모바일 입력 UX 원칙](mobile-input.md) 14절 | 접근성 라벨 4개, 콜드 스타트 두 줄, 큰 숫자 넘침 실기기 | 6절, 3.3 |
| [디자인 토큰](DESIGN.md) | 큰 숫자 넘침 초안 확정 | 6절 1번 |
| [화면 문법](screen-grammar.md) 10절 | 키패드 상한, 목록 줄 AX, 알약·칩 최소 높이, 탭 바 큰 콘텐츠 보기 | 6절 2~5번 |
| ADR 0010 | Android는 정식 출시 직전 이식 | 2절, 8절(ADR 0037이 "정식 출시 뒤"로 바꿈) |
| [인증 서비스 조사](../research/2026-11-11-auth-services.md) | 4.8 예외 원문, 계정 삭제 요건, 네이버 검수 | 조사 3절(확인함), 10절 |
| [앱 스택 조사](../research/2026-11-11-mobile-app-stack.md) | Apple 3.2.1(viii)·5.1.1(ix), Play 12명·14일 | 1절, 8절, 부록 B |

## 12. 넘기는 것

- **구현 티켓**: 3.2의 앱·서버 기능 전부, 7절의 심사용 가구 복원 스크립트, 6절의 점검 도구(콜드 스타트 표식은 [모바일 입력 UX 원칙](mobile-input.md)에서 이미 넘김).
- **시세 데이터 공급원**: 정식 출시 공급원을 3.1의 답으로 정한 뒤 종목 마스터·종가·배당 어댑터와 단가 칩 출처를 고친다.
- **통계 화면 구성**: 7절 시세 표시를 종가 전제로 고친다(3.2 화면 규칙).
- **가구원 나가기·계정 삭제**: 소셜 계정의 재인증 확인과 Apple 토큰 철회 재시도.
- **지도 밖 실행(운영자)**: 3.1 전부, 3.3의 문서 작성·게시와 스토어 제출, 7절 운영 항목.

## 부록 A. 문의 메일 초안

`[ ]`만 채운다. 원시 데이터를 재배포하지 않는다는 문장은 빼지 않는다. 보내기 전에 Alpha Vantage의 현재 무료 한도를 확인한다.

**Alpha Vantage** (premium@alphavantage.co)

```
Subject: Permission request: displaying daily closing prices in a free, non-commercial app

Hello Alpha Vantage team,

I'm an independent developer in South Korea building "oat", a free household
budgeting app for families. Users manually record their own stock trades, and
the app shows the value of their holdings.

I'd like to ask whether we may use Alpha Vantage data under these conditions:

- Data we need for US stocks and ETFs that users hold:
  - previous-day closing prices, unadjusted (raw) close
  - historical daily closes back to the date of each user's first trade
    (users may enter trades from several years ago)
  - the symbol list with listing status (active/delisted)
  - dividends, if possible
- Use: shown only as the valuation of each user's own holdings inside the app.
  We store the values on our server and show them again later. No raw price
  feeds, trading charts, or API access are offered to anyone.
- Scale: about [100] users and a few hundred symbols at launch, growing over
  time. The server fetches once per day plus one-time backfills for newly
  added symbols.
- Non-commercial: the app is free, with no ads and no in-app purchases
- Attribution: "Data provided by Alpha Vantage" shown on the relevant screens

Would this be allowed with written permission, and could the daily request
limit be raised for this use? If it requires a paid plan, could you tell me
which plan includes display rights for app users and its price?

Thank you,
[이름]
[앱/웹사이트 주소]
```

**marketstack** (사이트 Contact/Support)

```
Subject: Do Basic plan's "Commercial Use" terms cover display to app users?

Hello marketstack team,

I'm considering the Basic plan ($9.99/month) for "oat", a free household
budgeting app. Before subscribing, I'd like to confirm the scope of
"Commercial Use":

1. May we show end-of-day closing prices of US stocks/ETFs to the users of
   our mobile app, as the valuation of their own holdings, and store them to
   show again later? We don't redistribute raw data or provide API access to
   anyone.
2. Are unadjusted (raw) closes available, and how far back does daily
   history go (including delisted symbols)?
3. May we use your ticker list and listing status to let users search symbols?
4. Is a specific attribution text required?
5. Are ETFs and dividend data included for NYSE, NASDAQ and NYSE American?
6. What time (US Eastern) is the previous day's close usually available?

Scale: about [100] users and a few hundred symbols at launch, growing over
time; fetched once per day plus backfills for newly added symbols.

Thank you,
[이름]
[앱/웹사이트 주소]
```

**금융위원회 / 공공데이터포털** (data.go.kr 해당 데이터의 문의하기 또는 공공데이터 활용지원센터). 사업자등록 전에 개인 이름으로 보낸다.

```
제목: 금융위원회 주식시세정보 등 공공누리 제4유형 데이터의 무료 앱 이용 범위 문의

안녕하세요. 무료 가계부 앱 "oat"를 만들고 있는 개인 개발자입니다.
사용자가 직접 입력한 주식 보유 내역의 평가액을 보여주는 데 아래 데이터를
쓰려고 합니다.

- 금융위원회_주식시세정보, 금융위원회_증권상품시세정보 (종가)
- 금융위원회_KRX상장종목정보 (종목명·코드, 종목 검색)
- 한국예탁결제원 주식배당정보 (배당 일정)

이용 방식
- 앱은 무료이고 광고·유료 기능이 없습니다.
- 사용자에게는 본인이 보유한 종목의 평가액(종가 × 보유 수량)과 기준일,
  종목 검색 결과만 보여주며, 원시 데이터를 내려받게 하거나 API로
  제공하지 않습니다.
- 화면에 출처를 표시합니다.

여쭙고 싶은 것
1. 무료·광고 없는 앱에서의 이용이 공공누리의 "상업적 이용금지"에
   해당하지 않는지요? 앞으로 운영을 위해 개인사업자로 등록하더라도
   무료·광고 없음이 유지되면 같은지요?
2. 종가에 보유 수량을 곱해 평가액을 보여주는 것이 "변경금지"에 걸리지 않는지요?
3. 출처 표시 문구로 정해진 형식이 있는지요?

감사합니다.
[이름] / [연락처]
```

## 부록 B. App Review Notes 초안

```
oat is a household budgeting and asset record app. Users manually enter their
own income, spending and stock trades. oat does not transfer money, connect to
bank or brokerage accounts, use MyData, place orders, give investment advice,
or provide loans, and it never asks for financial institution credentials.
Prices are used only to show the value of holdings users entered themselves
(end-of-day closing prices; sources are credited in the app).

Demo accounts (same household):
- [demo1 이메일] / [비밀번호]
- [demo2 이메일] / [비밀번호]
Anyone can sign up; joining a household by invitation is optional.

oat는 사용자가 직접 입력한 수입·지출과 주식 거래를 기록하는 가계부·자산 기록
앱입니다. 송금·결제·계좌 연결·마이데이터·주문·투자 자문·대출을 제공하지 않고
금융기관 인증정보를 받지 않습니다. 시세는 사용자가 입력한 보유 종목의 평가액을
보여주는 데만 씁니다(종가, 출처 표기).
```

- 3.2.1(viii)·5.1.1(ix)로 거절되면 Resolution Center에 같은 내용으로 답하고, 필요하면 App Review Board에 이의를 낸다. 그래도 막히면 법인을 세워 조직 계정으로 전환한다(10절).
