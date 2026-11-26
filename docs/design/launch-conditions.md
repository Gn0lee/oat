# 정식 출시 조건 목록

- 결정일: 2026-11-26
- 티켓: [정식 출시 조건 목록: 계정·로그인·계약·법무·스토어 심사·품질 기준](https://github.com/Gn0lee/oat/issues/539)
- 관련 ADR: 0037(정식 출시는 iOS App Store 한국 공개 + 공개 가입, 개인 판매자 + 개인사업자), 0038(정식 출시 시세는 종가, 표시 권리는 서면으로), 0019(초대제 동안 KIS), 0021(브랜드·도메인), 0022(인증), 0023(MCP), 0024(나가기·계정 삭제)
- 조사: [정식 출시 조건 조사](../research/2026-11-26-launch-conditions.md)(스토어 정책·계정 종류·국내 법·시세 공급원)
- 이 문서는 **목록·순서·완료 기준**만 정한다. 실행(계약·등록·문의·실기기 점검)은 지도 밖에서 한다. 앱·서버 기능은 구현 티켓으로 간다.

## 1. 한 장 요약

| 항목 | 결정 |
|---|---|
| 정식 출시 | **iOS App Store 한국 공개 + 공개 가입.** 누구나 가입하고, 가구는 직접 만들거나 초대를 받아 들어간다. 초대 코드로 가입을 막지 않는다(Apple 3.2.2(v)) |
| Android | iOS 정식 출시 **뒤** 이식하고 따로 출시한다. iOS 출시를 막지 않는다(8절) |
| 판매자·계약 주체 | Apple **개인** 계정(본인 실명) + 간이과세 **개인사업자**. 등록 전에 회사 겸직 규정을 확인한다. 법인·조직 계정은 금융 앱 조항으로 끝내 막힐 때의 비상구다 |
| 상표 | **KIPRIS 검색에서 충돌 없음**이 조건이다. 출원("oat"·"오트" 9·36·42류)은 선택이고 출시를 막지 않는다 |
| 시세 | **국내·미국 보유 종목을 모두 종가로 평가할 수 있고, 표시 권리를 서면으로 확보한다.** 국내는 data.go.kr(무료인 동안, 하루 늦음), 미국은 Alpha Vantage 무료 허락 → marketstack Basic 순서로 문의한다. 장중 시세는 조건이 아니다(4절) |
| AI 연결 | 허용 목록 유지, ChatGPT 개인 계정 연결 확인, 외부 AI 고지를 동의 화면·앱 AI 연결 화면·처리방침 세 곳에, 가구 참여 때 한 줄 고지, 원시 시세를 내주지 않음(5절) |
| 품질 | 접근성 라벨 4개(VoiceOver·더 큰 텍스트·다크·색에만 의존하지 않음)와 콜드 스타트 두 줄. 라벨은 지금 Apple에서 선택이지만 우리 출시 조건이다(6절) |
| 운영 | 백업 복구 리허설 1회, 로그 보관(API 3개월·관리자 접속 1년), 유출 대응 절차 한 장, 문의 창구, 심사용 가구(7절) |
| 필요 없음 | 부가통신사업 신고, 통신판매업 신고, 유사투자자문 신고, 위치정보·전자금융·마이데이터 관련 등록(9절) |

## 2. 정식 출시의 정의

```
초대제                      iOS 정식 출시                     Android 출시
TestFlight 내부 테스트  →   App Store 한국 공개           →   Play 비공개 테스트 12명·14일
우리 가구만                 누구나 가입                       → Play 프로덕션
이메일 로그인               Apple·Google 로그인 추가
KIS 시세(회색지대)          표시 권리 있는 종가
```

- **초대제**: 전환한 가구만 TestFlight 내부 테스트로 쓴다([전환 당일 절차](cutover.md)). 앱 스토어 심사가 없다.
- **정식 출시**: 이 문서의 조건을 모두 넘고 App Store에 한국 한정으로 공개한다. 가입은 누구나 할 수 있고, 가구 초대는 가입한 뒤 쓰는 기능이다. 심사원이 비밀 경로 없이 앱 전체를 볼 수 있어야 한다(2.5.19).
- **Android 출시**: 정식 출시 뒤 이식한다. 공개 가입자 중에서 Play 비공개 테스터 12명을 모은다.
- 지도의 도착점은 iOS 정식 출시 조건과 구현 티켓 묶음이다.

## 3. 순서와 완료 기준

오래 걸리는 일(사업자·상표 검색·시세 문의)을 먼저 시작하고, 나머지는 함께 진행한다. 각 항목의 **완료 기준**을 넘어야 다음 단계의 의존 항목을 시작한다.

### 3.0 전환 전 (이미 정함)

| 항목 | 완료 기준 | 출처 |
|---|---|---|
| 유료 Apple 개발자 계정(개인) | 가입 완료, 판매자 이름 = 본인 실명 | [전환 당일 절차](cutover.md) 2절 |
| 도메인 oatday | 구매, Cloudflare Tunnel 공개 주소 연결 | [브랜드](brand.md), 전환 당일 절차 2절 |

### 3.1 1단계: 초대제 시작 직후

| 항목 | 완료 기준 | 의존 |
|---|---|---|
| 회사 겸직 규정 확인 | 취업규칙 겸직 조항 확인. 승인·신고가 필요하면 받음. 막히면 대안(배우자 명의 등)을 그때 판단 | — |
| 간이과세 개인사업자 등록 | 사업자등록증 발급 | 겸직 확인 |
| 상표 검색 | KIPRIS에서 "oat"·"오트"의 9·36·42류 선행 등록·출원을 검색해 사용을 막는 권리가 없음을 기록. 42류 디자인업 "OAT"(4020260186453)는 지정상품을 확인 | — |
| 상표 출원(선택) | 하면 "oat" 9·36·42류 고시명칭 전자출원(약 14만 원). 출시를 막지 않음 | 상표 검색 |
| 국내 시세 비상업 해석 문의 | 금융위원회(data.go.kr 제공기관)에 서면 문의를 보내고 답을 보관: ① 개인사업자가 운영하는 무료·광고 없는 앱이 공공누리 4유형의 "비상업"인지 ② 보유 수량을 곱한 평가액 표시가 "변경 금지"에 걸리지 않는지. 예탁원 배당정보(2유형)도 같이 묻는다 | — |
| 미국 시세 표시 허락 문의 | Alpha Vantage(무료 허락) → marketstack Basic(월 $9.99) 순서로 문의(부록 A). 첫 서면 허락을 보관 | — |

- 시세 문의 답이 모두 "안 됨"이면 그때 사용자 직접 입력과 유료 공급원(Twelve Data Venture 월 $124~, Tiingo 재배포 월 $250) 중에서 다시 정한다. 국내가 안 되면 Twelve Data 한국 표시 승인·코스콤 옵션 3 견적이 후보다.

### 3.2 2단계: 구현 기간 (앱·서버 기능)

구현 티켓으로 가는 항목이다. 완료 기준은 구현 티켓의 수용 기준이 된다.

| 항목 | 완료 기준 | 출처 |
|---|---|---|
| 공개 가입 | 초대 없이 가입 → 가구 만들기 또는 초대 수락. 심사원이 데모 계정으로 모든 기능에 닿음 | 이 문서 2절 |
| 만 14세 이상 확인 | 가입 화면에 "만 14세 이상" 확인. 14세 미만은 가입 불가(법정대리인 동의 절차를 두지 않음) | 개인정보보호법 22조의2 |
| Apple·Google 로그인 | 네이티브 ID 토큰으로 둘 다 추가(Google을 넣으면 Apple 필수, 4.8). Apple 이메일은 첫 로그인 때만 옴 | [인증](auth.md) |
| Apple 토큰 철회 | 로그인 때 refresh token 저장, 계정 삭제 때 `POST https://appleid.apple.com/auth/revoke` 성공 | [가구원 나가기·계정 삭제](member-leave.md), Apple 계정 삭제 안내 |
| Apple 서버 알림 주소 | 한국 개발자 필수인 Sign in with Apple server-to-server 알림 엔드포인트 등록, 계정 삭제·이메일 변경 이벤트 처리 | Apple 계정 삭제 안내 |
| 계정 삭제(앱 안) | 설정에서 바로 삭제, 공용 기록이 남는다는 고지(ADR 0024). 이미 설계됨 | 가구원 나가기·계정 삭제 |
| 시세 공급원 교체 | 국내 data.go.kr 종가·종목·배당, 미국은 허락받은 공급원. KIS 현재가·종가 작업을 끔. 공급원 인터페이스는 데이터 종류별([시세 데이터 공급원](market-data.md)) | 4절 |
| 시세 출처·기준일 표시 | 국내·미국 출처 문구를 허락 조건대로, 평가에 "11/25 종가 기준" | [통계 화면 구성](stats-screens.md) 7절 |
| AI 연결 고지·동의 | 5절의 세 곳 고지와 가구 참여 고지 | 5절 |
| 로그 보관 | API 접속 로그 3개월 이상, 관리자 접속기록 1년 이상 | 7절 |
| 푸시 운영 | APNs .p8 키(sandbox·production 전용으로 나눔), 기기 토큰마다 환경 저장, `410 Unregistered` 토큰 삭제 | [알림](notifications.md) |
| Privacy Manifest | `expo.ios.privacyManifests`에 정적 CocoaPods 이유를 옮김. TestFlight 업로드 뒤 경고 메일 없음. Google 로그인 라이브러리가 서명·manifest를 포함한 버전 | Apple 서드파티 SDK 요건 |
| 빌드 요건 | Xcode 26·iOS 26 SDK 이상, `ITSAppUsesNonExemptEncryption = NO`, iPad 지원 끔 | App Store 요건 |

### 3.3 3단계: 출시 직전

**문서·법무** (웹 랜딩에 게시하고 앱 안에서 링크)

| 항목 | 완료 기준 |
|---|---|
| 개인정보처리방침 | 9.1의 항목을 모두 담아 게시. 앱 안·App Store 메타데이터 양쪽에 링크 |
| 이용약관 | 9.2의 조항을 담아 게시. 가입 때 동의 |
| 지원 페이지 | 문의 이메일이 있는 지원 URL |
| 시세 권리 증빙 | 3.1의 서면 답을 보관(심사 5.2.2 요청 대비) |

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
| 심사용 가구 | 운영 서버에 계정 2개 + 샘플 기록, 심사 기간 서버 가동을 모니터링 |

**스토어 제출**

| 항목 | 완료 기준 |
|---|---|
| 배포 국가 | 한국만. EU DSA는 비 trader로 선언 |
| 한국 규정 준수 | 이메일·사업자등록번호 입력 |
| 이름·부제·키워드 | 이름 30자, 부제 30자, 키워드 100바이트(한글 약 33자). "기록"·"가계부"·"평가액" 중심, "투자 관리"·"자산 운용" 피함 |
| App Privacy 라벨 | Contact Info, Financial Info(Other Financial Info), User Content, Identifiers, Diagnostics(오류 추적을 쓰면). 모두 Linked, Tracking 없음 |
| 연령 등급 | 새 질문(13+/16+/18+ 체계)에 답함 |
| 스크린샷 | iPhone Dynamic Island 중간 크기(1179×2556 또는 1206×2622) 최소 1장 |
| 심사 메모 | 부록 B 문구 + 데모 계정 2개(같은 가구) |
| 접근성 라벨 | 4개 표시 |

## 4. 시세

ADR 0038. [시세 데이터 공급원](market-data.md)의 "정식 출시 전 표시 라이선스 공급원으로 교체"(ADR 0019)를 구체화한다.

- **출시 조건은 종가다.** 월별 자산 추이와 평가액은 종가로 계산된다. 장중 현재가는 허락받은 공급원이 주면 덤으로 쓰고, 없으면 쓰지 않는다. 초대제의 KIS 장중 현재가(1분)는 정식 출시 전에 끈다.
- **국내: data.go.kr.** 금융위원회 주식시세·증권상품시세(종가), KRX상장종목정보(종목), 예탁원 배당정보. 공공누리 4·2유형이라 **무료·광고 없음**인 동안만 쓴다. 기준일 다음 영업일 13시 이후에 올라와서 평가는 하루 늦다. 유료화나 광고를 시작하면 바꾼다(후보: Twelve Data 한국 표시 승인, 코스콤 옵션 3).
- **미국: 서면 허락을 받은 공급원.** 무료로 앱 사용자 표시를 허락하는 미국 종가 출처는 없다([조사](../research/2026-11-26-launch-conditions.md) 7.5). Alpha Vantage 무료 허락 → marketstack Basic(월 $9.99) 순서로 묻는다. 미국 배당을 그 공급원이 주지 않으면 배당 일정은 사용자 기록으로만 둔다.
- **긁어오지 않는다.** 가격 숫자에는 저작권이 없지만 API 약관(계약), 데이터베이스 보호(저작권법 93조), 부정경쟁방지법 데이터 조항, Apple 5.2.2(제3자 콘텐츠 권리 증빙)에 걸린다.
- **AI 연결은 원시 시세를 내주지 않는다.** MCP에 종목별 현재가·종가 목록 툴을 두지 않는다. `get_holdings`의 평가액·수익률은 그대로다. 공급원 문의 때 "원시 데이터를 재배포하지 않음"을 조건으로 적는다.

## 5. AI 연결

- **허용 목록 유지**: 확인한 클라이언트(Claude, ChatGPT·Codex, Hermes)의 CIMD만 받는다(ADR 0023). 요청이 오면 하나씩 확인해서 더한다.
- **ChatGPT 개인 계정 연결 확인**을 출시 전에 한다([MCP](mcp.md) 8절).
- **고지 세 곳**(Apple 5.1.2(i) "including with third-party AI", 개인정보보호법 28조의8)
  1. 서버 동의 화면(`/oauth/consent`): "조회만 허락" 위에 어느 회사(국가)로 무엇이 가는지, 언제든 앱에서 끊을 수 있다는 것.
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
- **로그 보관**: API 접속 로그(시각·IP·사용자 id·경로, 본문 제외) 3개월 이상(통신비밀보호법 시행령 41조 대비). 관리자(운영자)의 DB·관리 도구 접속기록 1년 이상(개인정보 안전성 확보조치 기준 8조).
- **유출 대응 절차**: 9.3.
- **문의 창구**: 지원 페이지와 이메일. 답장 시간 목표는 두지 않는다.
- **심사용 가구**: 운영 서버에 가구 하나, 계정 2개, 공용·개인 장부와 주식 샘플 기록. 심사 중 Uptime Kuma 알림을 본다. 심사가 끝나도 지우지 않고 다음 업데이트 심사에 다시 쓴다.

## 8. Android 출시 조건(추가분)

iOS 정식 출시 뒤에 시작한다.

| 항목 | 완료 기준 |
|---|---|
| 이식 | Android 빌드, Pretendard 굵기별 글꼴 이름 매핑([디자인 토큰](DESIGN.md)), targetSdk 36 이상 |
| 푸시 | FCM 프로젝트와 알림 채널 두 개([알림](notifications.md)) |
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
- **처리 위탁과 국외 이전**(28조의8 다섯 항목): 메일 발송, 오류 추적(쓰면), 외부 백업 저장소, Apple·Google 로그인, APNs(Android는 FCM)
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
- 이용 제한, 분쟁 관할

### 9.3 유출 대응 절차

- 유출 가능성을 안 때부터 72시간 안에 정보주체 통지와 개인정보위 신고(2026-09-11 개정)
- 통지 문구(무엇이, 언제, 어떻게, 피해를 줄이는 방법, 문의처), 보낼 경로(메일), 신고처
- 세션 전부 끊기·AI 연결 해지·키 교체의 순서

## 10. 필요 없거나 나중인 것

- **부가통신사업 신고**: 자본금 1억 원 이하는 신고한 것으로 본다(전기통신사업법 22조 5항, 시행령 30조).
- **통신판매업 신고**: 무료라 필요 없다. 유료화 때 간이과세자는 면제.
- **유사투자자문업 신고**: 사용자가 넣은 보유 내역·수익률·종가를 보여주는 것은 조언이 아니다. 종목 추천·매매 신호·AI 투자 의견을 앱이 직접 만들지 않는다.
- **위치정보·전자금융·마이데이터**: 해당 없음.
- **내부 관리계획**: 정보주체 1만 명 미만이면 생략할 수 있다.
- **카카오·네이버 로그인**: 요청을 보고 정한다([인증](auth.md)). 넣을 때 네이버 검수 요건과 카카오 Biz 앱(이메일)을 확인한다.
- **법인·Apple 조직 계정**: 금융 앱 조항(3.2.1(viii)·5.1.1(ix))으로 끝내 막힐 때. 전환 중 몇 주 TestFlight 업로드가 막힐 수 있다.
- **상표 출원**: 사용자가 늘거나 유료화할 때 다시 본다.

## 11. 넘어온 항목 대조

| 넘긴 곳 | 항목 | 이 문서 |
|---|---|---|
| [인증](auth.md) 6절 | 유료 Apple 계정, 도메인, Apple·Google 로그인, 계정 삭제 요건 | 3.0, 3.2 |
| [브랜드](brand.md) 5절 | 도메인, 상표 출원, 스토어 이름·부제·키워드 | 3.0, 3.1, 3.3 |
| [시세 데이터 공급원](market-data.md) 7절 | 표시 라이선스 공급원 계약 | 4절, 3.1 |
| [통계 화면 구성](stats-screens.md) 10절 | 데이터 출처 표시 문구 교체 | 3.2 |
| [MCP](mcp.md) 8절 | 허용 목록, ChatGPT 개인 계정, 처리방침 AI 문구 | 5절 |
| [가구원 나가기·계정 삭제](member-leave.md) 13절 | 처리방침(공용 기록·뼈대·백업 35일·AI), Apple 토큰 철회, 통신비밀보호법 | 9.1, 3.2, 7절 |
| [알림](notifications.md) 11절 | APNs 키, 실기기 푸시, 기기 토큰 고지, FCM·채널 | 3.2, 3.3, 9.1, 8절 |
| [모바일 입력 UX 원칙](mobile-input.md) 14절 | 접근성 라벨 4개, 콜드 스타트 두 줄, 큰 숫자 넘침 실기기 | 6절, 3.3 |
| [디자인 토큰](DESIGN.md) | 큰 숫자 넘침 초안 확정 | 6절 1번 |
| [화면 문법](screen-grammar.md) 10절 | 키패드 상한, 목록 줄 AX, 알약·칩 최소 높이, 탭 바 큰 콘텐츠 보기 | 6절 2~5번 |
| [인증 서비스 조사](../research/2026-11-11-auth-services.md) | 4.8 예외 원문, 계정 삭제 요건, 네이버 검수 | 조사 3절(확인함), 10절 |
| [앱 스택 조사](../research/2026-11-11-mobile-app-stack.md) | Apple 3.2.1(viii)·5.1.1(ix), Play 12명·14일 | 1절, 8절, 부록 B |

## 12. 넘기는 것

- **구현 티켓**: 3.2의 앱·서버 기능 전부, 6절의 점검 도구(콜드 스타트 표식은 [모바일 입력 UX 원칙](mobile-input.md)에서 이미 넘김).
- **지도 밖 실행(운영자)**: 3.1 전부, 3.3의 문서 작성·게시와 스토어 제출, 7절 운영 항목.
- **시세 공급원 최종 선택**: 3.1 문의 답에 따라 정한다. 모두 안 되면 다시 판단한다(사용자 직접 입력 또는 유료).

## 부록 A. 시세 문의 메일 초안

`[ ]`만 채운다. 원시 데이터를 재배포하지 않는다는 문장은 빼지 않는다.

**Alpha Vantage** (premium@alphavantage.co)

```
Subject: Permission request: displaying daily closing prices in a free, non-commercial app

Hello Alpha Vantage team,

I'm an independent developer in South Korea building "oat", a free household
budgeting app for families. Users manually record their own stock trades, and
the app shows the value of their holdings.

I'd like to ask whether we may use Alpha Vantage data under these conditions:

- Data: previous-day closing prices (and dividends, if possible) for US stocks
  and ETFs the users hold, a few hundred symbols in total
- Use: shown only as the valuation of each user's own holdings inside the app.
  No raw price feeds, charts for trading, or API access are offered to anyone.
- Scale: about [100] users at launch, server fetches once per day
  (about [300] requests/day)
- Non-commercial: the app is free, with no ads and no in-app purchases
- Attribution: "Data provided by Alpha Vantage" shown on the relevant screens

Would this be allowed on the free tier, or with written permission? If it
requires a paid plan, could you tell me which plan includes display rights
for app users and its price?

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
   our mobile app, as the valuation of their own holdings? We don't
   redistribute raw data or provide API access to anyone.
2. Is a specific attribution text required?
3. Are ETFs and dividend data included for NYSE, NASDAQ and NYSE American?
4. What time (US Eastern) is the previous day's close usually available?

Scale: about [100] users, a few hundred symbols, fetched once per day.

Thank you,
[이름]
[앱/웹사이트 주소]
```

**금융위원회 / 공공데이터포털** (data.go.kr 해당 데이터의 문의하기 또는 공공데이터 활용지원센터)

```
제목: 금융위원회 주식시세정보 등 공공누리 제4유형 데이터의 무료 앱 이용 범위 문의

안녕하세요. 개인사업자로 무료 가계부 앱 "oat"를 운영하려는 개발자입니다.
사용자가 직접 입력한 주식 보유 내역의 평가액을 보여주는 데 아래 데이터를
쓰려고 합니다.

- 금융위원회_주식시세정보, 금융위원회_증권상품시세정보 (종가)
- 금융위원회_KRX상장종목정보 (종목명·코드)
- 한국예탁결제원 주식배당정보 (배당 일정)

이용 방식
- 앱은 무료이고 광고·유료 기능이 없습니다.
- 사용자에게는 본인이 보유한 종목의 평가액(종가 × 보유 수량)과 기준일만
  보여주며, 원시 데이터를 내려받게 하거나 API로 제공하지 않습니다.
- 화면에 출처를 표시합니다.

여쭙고 싶은 것
1. 개인사업자가 운영하는 무료·광고 없는 앱에서의 이용이 공공누리의
   "상업적 이용금지"에 해당하지 않는지요?
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
