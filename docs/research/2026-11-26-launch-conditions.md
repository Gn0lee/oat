# 정식 출시 조건 조사: 스토어 정책·계정 종류·국내 법

- 대상 티켓: 정식 출시 조건 목록: 계정·로그인·계약·법무·스토어 심사·품질 기준, 상위 지도: oat 전면 개편 지도
- 기준일: 2026-11-26
- 전제: 1인 개발, 개인(사업자등록 없음). iOS 먼저(Expo CNG + 로컬 Xcode, EAS 미사용), Android는 정식 출시 직전 이식. 무료. 서버는 셀프호스팅(국내), 백업은 S3 호환 외부 저장소 35일. 초대제 동안 이메일 로그인만, 정식 출시 전 Apple·Google 로그인 추가. AI 연결(MCP)로 사용자가 외부 AI에 자기 데이터를 줄 수 있다.
- 표기: **[1차]** 공식 문서·법령 원문(법령을 옮긴 casenote·nepla·itwiki 포함, 시행일은 law.go.kr로 재확인 필요), **[2차]** 포럼·기사·블로그, **[해석]** 우리 판단.
- 줄임: `dev.apple` = `https://developer.apple.com`, `play` = `https://support.google.com/googleplay/android-developer`

## 요약

- **Apple 개인 계정으로 출시해도 된다.** 3.2.1(viii)·5.1.1(ix)는 금융기관·법인 제출을 요구하지만, 문언은 서비스를 "수행하는" 앱을 겨냥한다. 공동 가계부·주식 평가를 갖춘 개인 판매자 앱이 2026년에 여럿 출시돼 있다(1.3). 다만 개인 계정 앱이 업데이트 때 5.1.1(ix)로 거절된 사례가 하나 있어 위험이 0은 아니다. 심사 메모와 스토어 문구로 줄인다.
- **개인사업자는 Apple 조직 계정이 될 수 없다.** 조직은 법인 + D-U-N-S다. 조직 계정은 법인을 세울 때만 가는 비상구다.
- **초대 전용 가입은 공개 출시에서 위험하다.** 쓸 사람을 임의로 제한하는 것은 3.2.2(v) 금지이고, 심사원 전용 비밀 경로는 2.5.19 금지다. 공개 출시 때는 누구나 가입하고, 가구 초대는 가입 뒤 기능이어야 안전하다.
- **사업자등록은 무료 출시만 보면 필요 없지만, 시세 계약 때문에 출시 전에 하게 된다.** KIS 제휴는 사업자등록증을 요구한다. App Store Connect의 한국 규정 준수 정보에도 사업자등록번호 칸이 있다.
- **Google Play 개인 계정은 테스터 12명 × 14일 비공개 테스트가 필수**이고, 앱 밖에서 계정 삭제를 요청하는 **웹 링크**가 필수다.
- **접근성 라벨은 아직 선택**이다. 필수가 되는 날짜는 미발표다. "더 큰 텍스트" 라벨 기준은 200% 또는 시스템 최대 크기다.
- **국내 법에서 출시 전에 꼭 할 일**은 개인정보 처리방침(위탁·국외 이전 다섯 항목·자동 수집 장치·AI 연결), 만 14세 이상 확인, 이용약관이다. 부가통신사업 신고·통신판매업 신고·유사투자자문 신고는 필요 없다.

## 1. Apple 금융 앱 조항과 개발자 계정

### 1.1 조항 원문 [1차] dev.apple/app-store/review/guidelines/

- **3.2.1(viii)**: "Apps used for financial trading, investing, or money management should be submitted by the financial institution performing such services and must have necessary licensing and permissions in the locations where you make them available."
- **5.1.1(ix)**: "Apps that provide services in highly regulated fields (such as banking and financial services, healthcare, gambling, legal cannabis use, air travel and crypto exchanges) or that require sensitive user information should be submitted by a legal entity that provides the services, and not by an individual developer."

### 1.2 적용 여부

- [해석] 문언은 기관이 서비스를 **수행·제공하는** 앱을 겨냥한다. 돈을 옮기지 않고 사용자가 직접 기록하는 앱은 대상이 아니라고 본다.
- 가계부·지출 기록 앱이 이 조항으로 거절된 사례는 찾지 못했다(Apple 포럼, Reddit, 블로그, 한국어 검색). [2차]
- 가장 가까운 사례: 개인 계정의 무료 오픈소스 앱이 투자사 공개 API에 사용자 토큰을 넣어 계좌 데이터를 보여 줬다. 1년 넘게 출시돼 있다가 버그 수정 업데이트에서 5.1.1(ix)로 거절됐다. 해결 기록은 없다. [2차] dev.apple/forums/thread/740042
- 거절되면 리뷰어는 조직 계정으로 새로 가입하거나 개인 계정을 조직으로 전환하라고 안내한다. [2차] https://webtoapp.design/blog/data-collection-organization-account

### 1.3 개인 판매자로 출시된 비슷한 앱 [1차] (2026-11-26 iTunes Lookup·Search API, 국가 KR)

| 앱 | 판매자 | 비슷한 점 |
|---|---|---|
| 차곡 가계부: 자산관리, 주식연동, 부부커플 공동가계부 | 개인 | 공동·개인 장부 분리, 초대, 주식 손익. 2026-03 출시, 2026-11 업데이트 |
| 쌀독: 함께 쓰는 가계부 | 개인 | Apple·Google 로그인, 서버 저장, 둘이 쓰는 가계부. 2026-10 출시 |
| 엑셀코스피 | 개인 | 종목·수량 입력 → 실시간 시세로 총자산·수익률, 계정 동기화 |
| 누가, 위플 가계부, 윤슬 가계부, 투자노트, 모으다 | 개인 | 가계부·투자 기록 |

이 앱들이 심사에서 무엇을 겪었는지는 알 수 없다.

### 1.4 개인과 조직 계정 [1차]

- "If you are a sole proprietor/single-person business, you must join as an individual and your legal name will appear as the seller." dev.apple/help/account/membership/program-enrollment/
- 조직: "must be a legal entity that can enter into contracts with Apple. We do not accept DBAs, fictitious business names, trade names, or branches." 그리고 D-U-N-S가 필요하다. dev.apple/programs/enroll/
- → 한국 개인사업자는 조직이 될 수 없다. 법인을 세워야 한다. [해석]
- 개인 → 조직 전환은 요청으로 할 수 있다(창업자여야 하고 D-U-N-S 필요). dev.apple/help/account/manage-your-team/update-your-account-information/
  - Team ID는 유지된다는 Apple Developer Support 포럼 답변이 있다. [2차] dev.apple/forums/thread/853310
  - 전환 심사 중 몇 주 동안 새 TestFlight 빌드 업로드가 막혔다는 보고가 있다. [2차] dev.apple/forums/thread/840600
- 비용: 연 99 USD(현지 통화로 표시).

### 1.5 위험 줄이기 [해석]

- App Review Notes(한국어·영어): "oat는 사용자가 직접 입력한 수입·지출과 주식 거래를 기록하는 가계부·자산 기록 도구다. 송금·결제·계좌 연결·마이데이터·증권 주문·투자 자문·대출을 제공하지 않고, 금융기관 계정 정보나 금융 인증정보를 받지 않는다. 시세는 보유 종목의 평가액을 보여 주는 용도다."
- 스토어 설명과 스크린샷은 "기록"·"가계부"·"평가액 보기" 중심으로 쓰고, "투자 관리"·"자산 운용"은 피한다.
- 거절되면 Resolution Center 답변 → App Review Board 이의 → 그래도 막히면 법인을 세워 조직 전환.

## 2. App Store 제출 항목

| 항목 | 내용 | 출처 |
|---|---|---|
| 빌드 | 2026-04-28부터 Xcode 26·iOS 26 SDK 이상 | [1차] dev.apple/news/upcoming-requirements/ |
| App Privacy 라벨 | 필수. Contact Info(이메일·이름), **Financial Info › Other Financial Info**("salary, income, assets, debts"), User Content, Identifiers, Diagnostics. 모두 Linked, Tracking 아님 | [1차] dev.apple/app-store/app-privacy-details/ |
| 외부 AI 공유 | 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." | [1차] 가이드라인 |
| Privacy Manifest | required-reason API 이유가 없으면 업로드 거부. Expo는 `expo.ios.privacyManifests`. 정적 CocoaPods의 PrivacyInfo는 Apple이 제대로 못 읽어서 app.json으로 옮겨 적으라고 안내. 서명·manifest 필수 SDK에 hermes, GoogleSignIn, AppAuth, GTMAppAuth, GTMSessionFetcher | [1차] https://docs.expo.dev/guides/apple-privacy/ , dev.apple/support/third-party-SDK-requirements/ |
| 개인정보처리방침 URL | 메타데이터와 **앱 안 양쪽**. 수집 항목, 보존·삭제 정책, 동의 철회 방법 | [1차] 5.1.1(i) |
| 지원 URL | 필수, 실제 연락처 | [1차] |
| 연령 등급 | 4+/9+/13+/16+/18+ 새 체계. 새 앱은 제출 때 답함 | [1차] dev.apple/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions |
| 수출 규정 | OS HTTPS만 쓰면 면제, `ITSAppUsesNonExemptEncryption = NO` | [1차] |
| 스크린샷 | "iPhone with Dynamic Island (medium display)" 최소 1장(1179×2556 또는 1206×2622). iPad를 끄면 iPad 스크린샷 불필요 | [1차] |
| 메타데이터 | 이름 2~30자, 부제 30자, 키워드 **100바이트**(한글 약 33자), 설명 4000자 | [1차] |
| 데모 계정(2.1) | 로그인 앱이면 데모 계정 정보 필수, 심사 동안 서버가 켜져 있어야 함. 계정 종류가 여럿이면 각각 | [1차] |
| 초대 전용 | 직접 다룬 조항은 없음. 3.2.2(v) "Arbitrarily restricting who may use the app"은 금지. 서문 "family and friends에게만 보여줄 앱이면 App Store가 맞지 않다". 2.5.19 숨긴 기능 금지 | [1차] |
| EU DSA | 한국에만 배포해도 trader 여부는 선언해야 함. 비 trader면 연락처 공개 불필요 | [1차] dev.apple/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |
| 한국 규정 준수 | 한국 기반 개발자는 이메일과 **사업자등록번호**를 입력(전자상거래법 표시). 사업자 없는 개인의 무료 앱에 필수인지는 미확인 | [1차] dev.apple/kr/help/app-store-connect/manage-compliance-information/manage-korea-compliance-information/ |

## 3. 로그인·계정 삭제·푸시

- **4.8**: 서드파티·소셜 로그인으로 기본 계정을 만들면, 이름·이메일만 받고 이메일을 숨길 수 있는 다른 로그인도 같이 줘야 한다. 자사 계정만 쓰면 예외다. → Google을 넣으면 Apple 로그인이 필요하다(인증 설계와 같음). [1차]
- **5.1.1(v)**: 계정을 만들 수 있으면 앱 안에서 삭제할 수 있어야 한다. 비활성화만으로는 부족하다. 전화·이메일 요구 금지(규제 산업 예외). 공유한 사용자 콘텐츠도 삭제 대상이다. [1차] dev.apple/support/offering-account-deletion-in-your-app/
- **Apple 토큰 철회**: "Apps that support Sign in with Apple should use the Sign in with Apple REST API to revoke user tokens." `POST https://appleid.apple.com/auth/revoke`. 철회하려면 로그인 때 **refresh token을 저장**해 둬야 한다. [1차]
- **한국 개발자 추가 요건**: "developers based in the Republic of Korea must provide a server-to-server notification endpoint when registering a new Services ID". [1차] 같은 URL
- **4.5.4**: 푸시는 앱 기능에 필수이면 안 되고, 민감한 개인 정보를 보내면 안 된다. [1차]
- **APNs**: `.p8` 키, JWT(ES256) 1시간 안에 갱신. 키를 sandbox·production 전용으로 나눌 수 있다. 개발 프로파일은 sandbox(`api.sandbox.push.apple.com`), TestFlight·App Store는 production(`api.push.apple.com`). 환경이 다르면 `400 BadDeviceToken`, 죽은 토큰은 `410 Unregistered`. [1차] dev.apple/documentation/usernotifications/

## 4. 접근성 라벨(Accessibility Nutrition Labels)

- 9종: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions. [1차] dev.apple/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels
- **지금은 선택**: "providing these labels will be voluntary to start". 필수 시점은 미발표.
- "Common tasks" = 앱의 주 기능 + 첫 실행, 로그인, 구매, 설정. 막히면 긴급 수정을 낼 기능인지로 판단.

| 라벨 | 기준 요지 |
|---|---|
| VoiceOver | common tasks 전부를 VoiceOver만으로 끝낼 수 있음. 지원하는 모든 기기에서 테스트 |
| Larger Text | "at least 200% or the maximum font size for the system". 본문이 겹치거나 심하게 잘리면 안 됨. 탭 바는 Large Content Viewer로 대체 가능 |
| Dark Interface | common tasks 전체가 다크로 유지. 잠깐 밝게 번쩍이는 것도 문제 |
| Differentiate Without Color Alone | 색만으로 구분하지 않음. 차트는 범례·직접 라벨. Grayscale 필터로 점검 |

## 5. Google Play

| 항목 | 내용 | 출처 |
|---|---|---|
| 계정 종류 | 개인은 "student, hobbyist, or amateur". 조직은 D-U-N-S. 조직 필수 대상에 banking·loans·**stock trading**·투자 펀드가 있으나 가계부·직접 기록 앱은 없음 | [1차] play/answer/13634885 |
| 비공개 테스트 | 2023-11-13 이후 개인 계정은 "a minimum of 12 testers who have been opted in continuously for at least 14 days". 조직 계정은 대상 아님(보도) | [1차] play/answer/14151465 |
| 금융 기능 신고서 | 모든 앱 필수(테스트 트랙 포함). 해당 없으면 "My app doesn't provide any financial features". 분류에 "Stock trading and portfolio management"가 있어 헷갈릴 수 있음 | [1차] play/answer/13849271 |
| 계정 삭제 | 앱 안 경로 + **앱 없이 요청할 수 있는 웹 링크**. 페이지에 스토어의 앱·개발자 이름, 삭제·보관 데이터 설명 | [1차] play/answer/13327111 |
| targetSdk | 2026-08-31부터 새 앱·업데이트는 API 36 이상 | [1차] https://developer.android.com/google/play/requirements/target-sdk |
| Data safety | 처리방침 URL 필수, 전송 암호화·삭제 요청 여부 | [1차] play/answer/10787469 |
| App access | 로그인 정보 최대 5세트 | [1차] play/answer/9859455 |
| 콘텐츠 등급 | IARC 필수 | [1차] play/answer/9898843 |
| 비용 | 1회 25 USD | [1차] play/answer/6112435 |

## 6. 국내 법·행정

### 6.1 개인정보 처리방침 [1차] https://casenote.kr/법령/개인정보_보호법/제30조

- 필수 항목: 처리 목적, 처리·보유 기간, 제3자 제공, 파기 절차·방법, 처리 위탁, 정보주체 권리와 행사 방법, 보호책임자 연락처, **자동 수집 장치 설치·운영과 거부 방법**, 시행령 항목(안전성 확보조치 등).
- 현행 법 시행일은 2026-09-11(법률 21445호)이라 문구 변경을 law.go.kr에서 재확인해야 한다.
- 2026-04 작성지침 개정에서 생성형 AI 관련 항목이 생겼다(입력 데이터 저장·학습 사용·거부 방법). [2차] https://mobile.newsis.com/view/NISX20260424_0003604909
- **국외 이전(28조의8 1항 3호)**: 계약 이행에 필요한 위탁·보관이면 다섯 항목(항목, 국가·시기·방법, 받는 자, 목적·보유 기간, 거부 방법·효과)을 처리방침에 공개하면 되고 동의는 필요 없다. 오류 추적 SaaS, 메일 발송, 해외 백업 저장소가 여기에 든다. [1차]
- **AI 연결** [해석]: 사용자가 자기 AI 클라이언트로 가져가는 것이라 oat의 이전이 아니라는 쪽이 유력하다. 하지만 공용 기록에 다른 가구원 정보가 있어 제3자 제공·국외 이전으로 볼 여지가 남는다. 연결 때 앱 안 동의와 다섯 항목 고지, 처리방침 별도 항목, 언제든 해지로 대응한다. 공식 해석은 없다. [2차] https://zdnet.co.kr/view/?no=20260813164711
- **보호책임자**: 소상공인이면 지정하지 않아도 되고 대표자(본인)가 맡는다. [1차] 법 31조
- **14세 미만**: 법정대리인 동의가 필요하다(22조의2). 가입 때 "만 14세 이상" 확인으로 막는 것이 가장 간단하다. [해석]
- **안전성 확보조치**: 1만 명 미만 개인은 내부 관리계획 생략 가능. 나머지(접근 통제·암호화·접속기록)는 적용. 관리자 접속기록 1년 이상(5만 명 이상·민감정보면 2년). [1차] https://itwiki.kr/w/개인정보의_안전성_확보조치_기준_제4조 , 제8조
- **유출 통지**: 2026-09-11 개정으로 유출 가능성만 있어도 72시간 안 통지. [2차] https://www.lawtimes.co.kr/news/articleView.html?idxno=226491

### 6.2 사업자등록

- 무료 공개는 계속·반복 영리 활동으로 보기 어렵다는 해석이 일반적이다. 국세청 공식 기준은 못 찾았다. [2차]
- 필요해지는 때: 유료화·광고 수익, 그리고 **시세 계약**(KIS 제휴는 사업자등록증·인감증명서, KRX·코스콤·Tiingo는 미확인).
- 형태: 간이과세 개인사업자가 등록 무료·즉시. 법인은 Apple 조직 계정이 꼭 필요해질 때만. 회사 겸업 규정은 따로 확인. [해석]

### 6.3 신고가 필요 없는 것

- **부가통신사업 신고**: 자본금 1억 원 이하는 신고한 것으로 본다(전기통신사업법 22조 5항, 시행령 30조). [1차]
- **통신판매업 신고**: 무료면 불필요. 유료여도 간이과세자는 면제. [2차]
- **유사투자자문업**: 직접 넣은 보유 내역·수익률·시세를 보여주기만 하면 조언이 아니다. 종목 추천·매매 신호·AI 투자 의견을 앱이 직접 만들면 경계에 걸린다. [해석]
- 위치정보법·전자금융거래법·마이데이터: 해당 없음. [해석]

### 6.4 통신비밀보호법 로그 보관

- 전기통신사업자는 로그기록자료·접속지 추적자료를 3개월 이상 보관한다(시행령 41조 2항). [1차]
- 신고 의제 부가통신사업자도 전기통신사업자에 들 여지가 있다. 웹·API 접속 로그를 3개월 이상 두면 위험 없이 해결된다. [해석]

### 6.5 이용약관

- 법적 의무는 없지만 면책·이용 제한·삭제 기준은 약관이 있어야 효력이 생긴다. 약관규제법상 고의·중과실 면책 조항은 무효다. [해석]
- 넣을 조항: 시세 지연·오류와 투자 조언 아님, 출처 표기(공급원 계약이 요구하는 문구), 백업 35일과 경과실 책임 제한, 서비스 변경·종료 고지와 내보내기 기회, 가구 공용 기록의 처리, 외부 AI의 처리는 책임 밖, 정지·탈퇴·관할.

### 6.6 상표 [1차] 「특허료 등의 징수규칙」 2026-02-27 시행

- 전자출원 1류당 52,000원(고시명칭만 쓰면 46,000원), 설정등록료 201,000원, 우선심사 160,000원.
- "oat" 9·36·42류 고시명칭 출원은 138,000원. "오트"를 따로 내면 두 배.
- 일반 심사 약 13~14개월, 우선심사 약 45일. [2차] https://m.go.seoul.co.kr/news/publicnews/2025/10/09/20251009500071
- 등록 전에 출시해도 법적 문제는 없다. 먼저 출원한 사람이 권리를 가지므로 출시 전에 출원한다. [해석]

## 7. 정식 출시용 시세 공급원

앞 조사([시세·환율 공급원 조사](2026-11-18-market-data-providers.md))에서 KIS·data.go.kr·KRX Open API는 제3자 제공 금지, EODHD·Massive 표시 권리는 월 $2,499임을 확인했다. 여기서는 작은 앱이 정식으로 쓸 수 있는 경로를 찾았다.

### 7.1 국내

| 항목 | 내용 | 출처 |
|---|---|---|
| 계약 형태 | 가입자에게 정보를 주는 "정보사업자"는 코스콤과 일반 정보이용계약. **옵션 3 "웹사이트 체결가서비스용"**: 웹·모바일 앱으로 일반 대중에게 호가 뺀 정보를 조회 방식으로 제공 | [1차] [정보이용정책 2024-01-01](https://data.krx.co.kr/inc/datasale/Market%20Data%20Usage%20Polices_ko.pdf) |
| 옵션 3 제한 | "제3자가 정보를 가공·저장·재분배할 수 있는 API·DDE 등"은 엄격히 금지. 전문가 사용자용 서비스 불가 | [1차] 같은 문서 2절 |
| 사용량 보고 | 웹사이트 체결가서비스 이용자는 월별 보고 대상 아님. 코스콤 요청 시 앱 접속 권한 무상 제공 | [1차] 같은 문서 5절 |
| 지연·종가 요금 | 무료 조항은 없음. 변동료가 "실시간정보" 기준이라 지연·종가는 변동료 대상이 아닐 가능성(추정) | [1차] 같은 문서 4·5절 |
| 이용료 | 기본료 + 변동료, 금액은 문의 | [1차] [코스콤 FAQ](https://www.koscom.co.kr/portal/main/contents.do?menuNo=200407) |
| 참고 가격 | 상장사 IR 페이지 실시간 주가 게시 월 10만 원(2021 기사) | [2차] [뉴스토마토](https://www.newstomato.com/readNewspaper.aspx?no=1056177) |
| 코스콤 오픈API플랫폼 | 시세 라이선스 계약이 먼저, "개인사업자는 이용 불가" 문구. 문의: 코스콤 시장데이터영업팀 | [1차, 검색 발췌] [koscom gitbook](https://koscom.gitbook.io/open-api/how-to-use/procedure) |
| 개인 계약 사례 | 개인·개인사업자가 코스콤과 시세 계약을 맺어 앱에 표시한 후기는 찾지 못함. 정보이용계약 자체에는 개인/법인 구분 문구가 없고 "정보사업자"로 분류. 신청은 정보이용신청서 → 한국거래소 승인 → 코스콤 계약 | [2차] 검색, [1차] [코스콤 FAQ](https://www.koscom.co.kr/portal/main/contents.do?menuNo=200407) |
| 옛 요금 수준 | 2014 코스콤 해명문: 실시간 체결정보 기본료 유가증권 월 150만 원·코스닥 월 75만 원, 개인 가입자 5만 명까지 1인당 월 2천 원. 지연·종가 언급 없음. 현행 요금인지 미확인 | [1차, 2014] [코스콤 보도해명](https://m.koscom.co.kr/mobile/bbs/B0000006/view.do?nttId=10104&delcode=0&menuNo=400104&pageIndex=29) |
| KRX Data Marketplace | 상품 가격 미확인. 2026-05 과거 데이터 가격 30~40% 인상 보도 | [2차] [세계일보](https://www.segye.com/newsView/20260505509201) |
| 증권사 API | 고객이 아닌 사람에게 표시를 허용하는 곳은 못 찾음 | [2차] |
| 국내 재판매처 | 에프앤가이드·인포스탁 등 공개 조건 없음 | 미확인 |

비슷한 앱: "주식 위젯"은 Yahoo 20분 지연(비공식)과 사용자 본인 KIS 키 연결. 더리치는 계좌 연동. 정식 계약을 밝힌 소규모 앱 사례는 찾지 못했다. [1차] App Store

### 7.2 미국

- **거래소 요금**: UTP "Delayed Subscriber Usage is not currently fee liable", "End-of-Day Usage is not currently fee liable"(15분 지연, 화면에 지연 표시 필수). 새 CT Plan 요금표(SEC 승인 2026-06-26)도 지연·종가 이용자는 non-billable. [1차] [UTP Data Policies 2026-10](https://utpplan.com/DOC/Datapolicies.pdf), [SEC 34-105778](https://www.sec.gov/files/rules/sro/nms/2026/34-105778.pdf)
- 그래서 비용은 공급업체 요금뿐이다.

| 업체 | 앱 표시 가능 요금제 | 메모 |
|---|---|---|
| Tiingo | Base Equities Redistribution 월 $250(스타트업)·$500. 종가 + IEX 실시간 + 배당 + 마스터 | [1차] [IEX](https://www.tiingo.com/products/iex-api). 한국 없음. 출처 표기 필수, 조건은 이메일 계약 |
| Twelve Data | Venture 월 $149~(연간 $124~), "External display data access" 포함 | [1차] [pricing-business](https://twelvedata.com/pricing-business). 미국 밖 시세의 상업 이용은 추가 승인 필요 [1차] [usage](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage) |
| Intrinio | Startup 월 $333 → 6개월 뒤 $666 → 1년 뒤 $999, 표시 권리 포함 | [1차] [pricing](https://intrinio.com/pricing) |
| FMP·Finnhub·Alpaca | 표시는 별도 계약·문의 | [2차] |

### 7.3 국내·미국을 한 곳에서

- **Twelve Data**: XKRX·KOSDAQ 종가 제공. 한국 시세의 앱 표시는 Twelve Data 승인 대상이고, KRX·코스콤 라이선스가 따로 필요한지는 미확인(ASX는 직접 라이선스를 요구한 전례). [1차] [exchanges](https://twelvedata.com/exchanges), [ASX](https://support.twelvedata.com/en/articles/13001919-australian-equities-market-data)
- EODHD는 표시 권리가 월 $2,499 수준. LSEG·Morningstar·Xignite는 견적제.

### 7.4 조합과 비용 (1달러 = 1,400원 가정)

| 조합 | 구성 | 월 비용 |
|---|---|---|
| A 한 곳으로 | Twelve Data Venture(미국 종가·시세 + 한국 종가). 한국 표시 승인을 서면으로 받아야 함 | 약 17만~21만 원 |
| B 정석 | 한국: 코스콤 옵션 3(종가 또는 지연), 미국: Tiingo 재배포 | 코스콤 견적 + 약 35만 원 |
| C 미국만 | 미국만 정식, 한국은 시세 없이 | 약 17만~35만 원 |

- **MCP 주의**: 옵션 3은 API로 시세를 제3자에게 주는 것을 금지한다. AI 연결이 원시 시세(현재가·종가 목록)를 내주면 걸릴 수 있다. 평가액처럼 가공한 값만 내주는 방식이 안전하다. 계약 문의 때 함께 묻는다.
- **미확인**: 코스콤 옵션 3 금액·개인사업자 계약 가능 여부·기간, Twelve Data의 한국 표시 승인 절차와 한국 배당·폐지 종목 커버리지, Tiingo 계약 원문(사용자 수 상한), 한국 배당 데이터의 정식 출처.

### 7.5 미국 종가의 무료·저가 경로

data.go.kr처럼 무료이면서 앱 사용자에게 보여줘도 되는 미국 종가 출처는 **찾지 못했다**.

| 출처 | 앱 사용자 표시 | 비용 | 근거 |
|---|---|---|---|
| data.go.kr·예탁결제원 국제거래 API | 미국 시세 없음(DR·결제 건수만) | 무료 | [1차] [15059582](https://www.data.go.kr/data/15059582/openapi.do), [15157414](https://www.data.go.kr/data/15157414/openapi.do) |
| SEC·FRED·Nasdaq Data Link | 개별 종목 종가 없음 또는 재배포 금지·유료 | — | [1차] [FRED legal](https://fred.stlouisfed.org/legal/) |
| Alpha Vantage 무료 | 안 됨. 다른 사람이 정보에 접근하게 하는 활동은 수익과 무관하게 "commercial". 상업 이용은 premium@alphavantage.co 문의 | 무료 | [1차] [terms](https://www.alphavantage.co/terms_of_service/) |
| Finnhub·Tiingo·Twelve Data Basic·EODHD·Massive·FMP 무료·개인 | 안 됨(개인용·내부용) | 무료 | [1차] 각 약관 |
| Alpaca(IEX) | 안 됨("you cannot redistribute Alpaca API data") | 무료 | [2차] [Alpaca](https://alpaca.markets/support/redistribute-alpaca-api) |
| IEX TOPS 15분 지연 | 불명확. IEX 체결분만(공식 종가 아님), 거래소 계약·피드 설비 필요 | 무료 | [2차] [SEC 34-105989](https://www.sec.gov/files/rules/sro/iex/2026/34-105989.pdf) |
| **marketstack Basic** | 불명확. 가격표에 "Commercial Use"만, 표시 조항 없음. 미국 데이터는 Tiingo 공급 | **월 $9.99** | [1차] [pricing](https://marketstack.com/pricing), [agreement](https://marketstack.com/agreement) |
| marketdata.app Commercial | 됨(앱 사용자 표시 명시) | 월 $333~ | [1차] [pricing](https://www.marketdata.app/pricing/) |

- 판단: 가장 싼 후보는 marketstack Basic이지만 표시 권한을 **서면으로 확인**해야 한다. Alpha Vantage에는 비영리·광고 없음·소규모·출처 표기를 조건으로 무료 허락을 요청해 볼 수 있다. 둘 다 안 되면 Twelve Data Venture(월 $124~)나 Tiingo 재배포(월 $250).
- 미확인: marketstack Basic의 표시 권한, Stooq 약관, SEIBro 자체 API의 해외 종가, 사용자 본인 키(BYOK) 방식의 허용 여부.

## 8. 미확인

- 수기 가계부를 3.2.1(viii) "money management"로 보는지에 대한 Apple 공식 해석, 실제 거절 사례.
- 개인 → 조직 전환 때 Bundle ID·Sign in with Apple·푸시 키 유지(공식 문서 없음).
- 한국 규정 준수 정보의 사업자등록번호가 사업자 없는 개인에게 필수인지.
- 초대 전용 가입에 대한 Apple 공식 입장. [2차] dev.apple/forums/thread/849775 (답 없음)
- 접근성 라벨이 필수가 되는 날짜.
- Play 금융 기능 신고서에서 수기 포트폴리오 기록을 어느 항목으로 고르는지.
- KRX·코스콤·Tiingo 계약이 사업자를 요구하는지, 비용.
- 개인정보보호법 시행령 31조 현행 원문, 2026-09-11 개정 후 30조 문구.
- AI 연결로 다른 가구원 데이터가 해외 AI로 갈 때 동의가 필요한지(개인정보위 해석 없음).
- 2026년 상표 심사 기간.
