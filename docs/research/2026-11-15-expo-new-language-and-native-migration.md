# Expo의 새 언어(Exact/Contract)와 RN → 네이티브 이전 가능성

- 조사일: 2026-11-15
- 관련 문서: `2026-11-11-mobile-app-stack.md`(스택 비교, Expo 추천), `2026-11-15-amount-input-and-rn-input-feel.md`(금액 키패드·입력 체감은 그쪽에서 다뤄서 여기서는 빼요)
- 전제: 1인 개발, iOS 먼저 → 정식 출시 직전 Android 포팅, TypeScript 서버 셀프호스팅, Expo(CNG + 로컬 Xcode 빌드, EAS 미사용) 쪽으로 기울어 있음
- 방법: 1차 출처(저장소 README·문서, 작성자 본인 글, 회사 엔지니어링 블로그, 공식 문서)를 우선 인용했어요. 1차 출처로 확인하지 못한 건 "미확인" 또는 "추정"으로 표시했어요.

## 1. 결론 먼저

- **"Expo가 발표한 새 언어"는 Exact 프레임워크의 UI 언어 Contract로 보여요.** Expo 공동창업자 Charlie Cheever가 2026-11-09에 "A preview of Exact"로 공개했고, 저장소는 `expo/exact`(MIT)예요. 상태는 **pre-alpha / pre-1.0**이고 API 안정성·하위 호환·마이그레이션 가이드가 "의도적으로" 없어요.
- **Exact는 React Native가 아니에요.** Rust 런타임 + Contract(선언형 UI 언어) + TypeScript/Rust 데이터 로직 구조이고, "JSX나 React 계층은 없다"고 README에 적혀 있어요. 그래서 **기존 Expo 앱에 화면 단위로 섞어 쓰는 경로는 공식적으로 없어요.** (Swift 앱에 끼워 넣는 ExactKit은 있어요.)
- **Android는 발표 시점에 "초기(early)"였고 배포·스토어 패키징이 없었어요.** 지금(11-15) README는 Android 서명 App Bundle 빌드까지 적혀 있지만 여전히 "early"이고, 저장소 한 줄 소개는 "web, macOS, iOS, Linux"만 말해요. Android 로드맵 날짜는 없어요.
- **oat에 대한 판단: Exact는 지금 채택 후보가 아니에요.** pre-alpha + API 매일 변경 + Android 미성숙이라, "정식 출시 직전 Android 포팅" 일정과 맞지 않아요. 6~12개월 뒤 다시 볼 관찰 대상으로만 두면 돼요.
- **나중에 네이티브로 옮기는 건 현실적이지만, Shopify 사례는 "화면 단위 섞기"가 아니라 "그린필드 재작성(에이전트가 RN 코드를 참조)"이었어요.** Shop 앱은 6명 코어 팀이 12주 만에 SwiftUI/Compose로 다시 써서 스토어에 냈어요.
- **지금 해 둘 일은 "얇은 클라이언트"예요.** 계산·검증·권한을 서버에 두고, API 계약을 OpenAPI(또는 JSON Schema)로 뽑아 두면 나중에 Swift/Kotlin 클라이언트를 생성기로 만들 수 있어요. 화면(UI)과 내비게이션은 어떤 경로로 가도 다시 써야 해요.

## 2. A. Expo의 새 언어: Exact와 Contract

### 2.1 확인된 사실 (1차 출처)

| 항목 | 내용 | 출처 |
|---|---|---|
| 이름 | 프레임워크 **Exact**, UI 언어 **Contract** | Cheever 블로그, `expo/exact` README |
| 발표 | 2026-11-09, Charlie Cheever의 글 "A preview of Exact"와 X 게시물. 저장소 생성은 2026-11-02 | https://ccheever.expo.app/ , https://x.com/ccheever/status/2119764253242695754 , GitHub API |
| 정체 | "Agent Native app framework written in Rust". 레이아웃·렌더링·앱 로직을 모두 다루는 크로스플랫폼 앱 런타임 | Cheever 블로그, README |
| Contract | 들여쓰기 문법(Python 비슷), 명시적·강타입. UI·상태·데이터 흐름을 한 언어로 기술(React + Zustand/TanStack Query 역할). 뷰 안에 JS 없음, 액션 안에 루프·`await` 없음, 재귀 금지 → 전부 정적 분석 가능. 컴파일러가 에이전트에게 고칠 방법을 알려 주는 오류를 냄 | README "Contract" 절, Cheever 블로그 |
| 컴파일 대상 | Contract → "plan"(테이블 + 바이트코드). 웹은 ~20KB 런타임 위 ES 모듈 하나가 실제 DOM을 다루고, iOS/macOS/Linux는 Rust runner가 plan을 실행하고 Taffy(CSS 레이아웃)로 박스를 계산해요 | README "How it works" |
| iOS 렌더링 | **UIKit + CoreText**(SwiftUI 아님). macOS는 AppKit("no SwiftUI"라고 명시). 웹뷰·JS 브리지 없음, 첫 픽셀 전에 앱 JS 실행 없음 | README |
| 로직 언어 | TypeScript(네이티브에서는 Hermes 바이트코드로 빌드 타임 컴파일) 또는 Rust. 단순 HTTP 읽기는 Contract에서 선언만으로 가능 | README |
| 상태 | **pre-alpha**(블로그), "pre-1.0, changes daily. No API stability, no backwards compatibility, no migration guide, by design"(README). 릴리스 절차는 미정 | Cheever 블로그, README |
| 라이선스 | **MIT** | GitHub API, Cheever 블로그 |
| Expo와 관계 | "The Expo framework isn't going away." Exact는 Expo의 빌드·업데이트 등 클라우드 서비스와 함께 쓸 수 있게 한다고 함. 저장소는 `expo` 조직 소속. README 참고 문서에는 "Exact does not need Expo or React Native at run time"이라고 적혀 있어요 | Cheever 블로그, `docs/reference.md` |
| React와 관계 | "No JSX or React tier. Nothing runs JavaScript above the data seam. The door stays open, but no one is building it." | README "Not yet, or not at all" |

### 2.2 플랫폼 지원과 Android

- **발표 시점(11-09 직전 커밋의 README)**: "Android. Early. 앱이 빌드되고 에뮬레이터·폰에서 돌아가지만 … Delivery and store packaging don't exist yet." 사용자가 읽은 "Android 지원 없음"은 이 상태를 가리키는 것으로 보여요. 저장소 한 줄 소개도 지금까지 "web, macOS, iOS, and Linux"예요.
- **현재(11-15 README)**: "Android. Admitted (2026-10-07) and early." `bun exact.mjs android --bundle`로 서명된 AAB를 만들 수 있고, Play 업로드·심사 제출은 "검증되지 않음"이에요. (README, `docs/recipes/mobile-build.md`)
- Cheever 블로그는 성숙도 순서를 iOS > 웹·macOS("pretty good") > Android·Windows·Linux("work but are less mature")로 적었어요.
- **Android 로드맵 날짜는 어디에도 없어요.** `QUEUE.md`는 다음 작업 목록일 뿐 날짜 약속이 아니에요.

### 2.3 Expo 앱과 섞어 쓸 수 있나

- **기존 Expo/RN 앱 안에 Exact 화면을 넣는 방법은 문서에 없어요.** React 계층이 없다는 문장과 "Expo/RN이 런타임에 필요 없다"는 문장을 보면, 두 런타임은 별개예요. (화면 단위 혼용 가능 여부는 **미확인**, 공식 경로가 없다는 것까지만 확인)
- 반대로 **기존 Swift 앱에 Exact 세션을 끼워 넣는 ExactKit**은 있다고 README "Working"에 적혀 있어요.
- 플랫폼 위젯은 "native module"(하이픈 태그, 예: `exact-map`)로 Swift·Kotlin·Rust로 작성해요. Expo SDK 모듈(`expo-*`)을 그대로 쓸 수 있다는 언급은 **없어요.** 카메라 등은 Exact 자체 패키지(`@exact/camera`)로 따로 있어요.

### 2.4 도구·빌드

- **로컬 빌드 가능, EAS 필수 아님.** macOS + Xcode 27.1 이상 + Rust + Bun 1.4.2 + Chrome이 필요해요. `bun exact.mjs ios --run`으로 시뮬레이터, `--device`로 실기기, 서명 IPA까지 로컬 명령이 있어요. 첫 네이티브 빌드는 10~15분, 이후 1~2분이에요. (README Quick start, `docs/recipes/mobile-build.md`)
- EAS 레시피(`recipes/eas-ios.md`, `eas-android.md`)는 선택 사항이고, `QUEUE.md`에 "실제 EAS 워커에서 배포 서명·업로드·스토어 제출 검증"이 아직 할 일로 남아 있어요.
- 패키지된 CLI는 없어요. 소스 체크아웃에서 작업하고 `exact new` 앱이 그 경로를 참조해요.
- 서명된 업데이트 번들(OTA 비슷한 것)과 웹 배포 스크립트가 있어요.
- 사용 중 마찰을 Expo 쪽 엔드포인트로 보내는 피드백 기능이 있는데 기본은 "ask"(보내기 전에 물어봄)예요.

### 2.5 추정·비확인 정보 (2차 출처)

- daily.dev 요약은 대상 플랫폼에 Android·Windows를 넣고 라이선스를 "미기재"라고 했는데, 1차 출처와 달라요. (https://daily.dev/posts/expo-s-ceo-just-built-a-react-native-alternative-ys3pasiha)
- "Astro/Next.js보다 빠르다", "120fps 스크롤" 같은 성능 주장은 Expo 계정 게시물과 README 자체 측정이에요. 독립 벤치마크는 못 찾았어요. (https://x.com/expo/status/2119805185967169720)
- 2차 기사 중에는 Shopify의 네이티브 회귀에 대한 대응이라는 해석이 있지만, Cheever 본인이 그렇게 말한 문장은 확인하지 못했어요.

### 2.6 헷갈릴 수 있는 다른 발표: Expo Modules 2.0

- 2026-09-08 Expo 블로그 "An early look at Expo Modules 2.0"은 새 언어가 아니라, 네이티브 모듈을 **애너테이션 붙인 평범한 Swift/Kotlin 클래스**로 쓰게 바꾸는 API예요(`@ExpoModule`, `@JS` 등). 발표 시점에 **iOS 전용**이었고 Android는 "진행 중"이었어요. SDK 57에 실험적으로 들어갔고 SDK 58에서 공식 베타·문서를 예고했어요. (https://expo.dev/blog/an-early-look-at-expo-modules-2-0)
- "Android 지원 없이 발표"라는 기억이 이 글과 섞였을 수도 있어요. 다만 "새 프로그래밍 언어"에 맞는 건 Exact/Contract예요.

## 3. B. 나중에 RN/Expo → 네이티브(SwiftUI/Compose)로 옮기기

### 3.1 Shopify "back to native" (2026-09-10)

출처: Mustafa Ali, "Native is now the future of mobile at Shopify" (https://shopify.engineering/back-to-native), Max Da Silva 외, "Migrating Shop app from React Native to native" (https://shopify.engineering/shop-app-migration)

- **방식: 그린필드 재작성.** 브라운필드(점진 이전)와 비교한 뒤 "greenfield emerged as a clear winner"라고 했어요. 이유는 LLM이 RN 버전을 참조해 Swift·Kotlin 기능을 만들 수 있고, 백지에서 시작하면 옛 제약을 안 끌고 간다는 것이에요. 2020년 RN 도입 때는 일부 앱을 브라운필드로 했어요.
- **다만 작업 단위는 화면별이에요.** 내부 도구 Helix가 RN 코드를 읽고 한 화면씩 작은 체크포인트로 나누고, 각 체크포인트는 테스트 통과·실행 중인 앱과 시각 일치·적대적 코드 리뷰 2회·사람 승인을 거쳐요. "원샷 변환은 안 됐다"고 적었어요. 즉 **"화면 단위로 옮기되, 한 앱 안에 RN과 네이티브를 섞어 배포하진 않고 새 앱을 통째로 교체"**한 거예요.
- **이유**: 2020년 결정의 핵심 가정(같은 기능을 두 번 만드는 비용)을 LLM이 바꿨다는 것. 플랫폼 기능·1st-party 도구 접근이 가깝고 프레임워크 계층이 적다는 것. RN 앱도 "빠를 수 있고, 우리 앱도 빠르다"고 인정했어요. "React Native was the right choice for Shopify in 2020."
- **에이전트 활용**: 한 플랫폼 구현을 다른 플랫폼의 참조로 사용, 공유 스펙·테스트·리뷰 체크포인트로 플랫폼 간 동등성 유지. 비즈니스 로직을 UI에서 떼어 헤드리스로 돌리고, CLI로 앱 상태를 밀리초 단위로 확인하게 해서 시뮬레이터 대기 시간을 줄였어요. Shop 앱 쪽은 Tardis(실행 중 앱의 이벤트·로그·상태 접근, 두 앱의 체크포인트 스크린샷 비교)와 서브에이전트 워크플로를 썼어요.
- **일정**: Shop 앱은 1주 PoC(엔지니어 1명) → 12주 만에 스토어 출시, 코어 6명 + 중간 합류 기능팀. Shopify 앱(300개 이상 화면, 위젯, Watch, Siri 단축어)은 2026년 하반기 목표로 진행 중.
- **남긴 것**: RN을 어느 앱에 남긴다는 말은 없고 "모든 모바일 앱을 Swift·Kotlin으로" 옮긴다고 했어요. 넘겨받은 건 기능 동작과 하류 시스템이 의존하는 분석 이벤트, 기존 사용자 로그인·푸시 유지("일반 앱 업데이트처럼 느껴져야 함")예요. RN Skia는 포크·이관, FlashList는 호환성 수정만 유지, Restyle은 보관 처리.
- **결과(Shop 앱)**: 시작 시간 iOS 23%, Android 50% 단축, Android 앱 크기 109MB 감소, Android 릴리스 빌드 시간 약 75% 감소.
- **교훈**: "Native expertise remained essential." 생성 코드는 중복·아키텍처 표류·성능 문제를 만들 수 있어 린트·테스트·정적 분석·리뷰가 계속 필요했어요.

### 3.2 점진 이전의 실제 수단

**(1) 네이티브 앱 안에 RN 넣기 (브라운필드) — 네이티브로 옮겨 가는 중간 단계로 쓸 수 있음**

- Expo 공식 브라운필드 문서가 있어요. 방식은 두 가지예요. (https://docs.expo.dev/brownfield/overview/)
  - **통합형(integrated)**: 기존 네이티브 프로젝트 안에 Expo 프로젝트를 둠.
  - **분리형(isolated)**: RN 코드를 XCFramework(iOS)/AAR(Android)로 묶어 네이티브 앱이 일반 의존성처럼 가져감. `expo-brownfield` 패키지가 담당하고 SDK 55에서 도입됐어요.
- 상태: "Support for integrating Expo modules into existing native projects is in alpha." Expo Dev Client는 미지원, Expo Router·Updates 등은 지원으로 표시돼요.
- `expo-brownfield` API: RN↔네이티브 메시지(`sendMessage`, `BrownfieldMessaging`), 공유 상태(`useSharedState`), RN 화면을 닫고 네이티브로 돌아가는 `popToNative`, 뒤로 가기 제어 `setNativeBackEnabled`. 네이티브에서 특정 RN 라우트로 바로 보내는 API는 문서에 없어요. (https://docs.expo.dev/versions/latest/sdk/brownfield/)
- Callstack `react-native-brownfield`(MIT): iOS UIKit·SwiftUI, Android Fragment·Compose 지원, RN 인스턴스 하나를 여러 컴포넌트가 공유. (https://github.com/callstack/react-native-brownfield) Callstack은 2026-02 v3에서 Expo 설정 플러그인을 넣었다고 밝혔어요(벤더 자체 글).

**(2) RN 앱 안에 네이티브 화면·뷰 넣기 — 지금 Expo 앱에서 바로 쓸 수 있는 방향**

- Expo Modules API로 Swift/Kotlin 네이티브 뷰를 만들어 RN 화면에 넣을 수 있어요. Modules 2.0은 `@ExpoView`로 뷰 작성을 다음 단계로 예고했어요.
- Expo UI(`@expo/ui/swift-ui`)는 RN에서 SwiftUI 뷰를 `Host` 안에 렌더링해요(내부적으로 `UIHostingController`). 반대 방향 `RNHostView`로 SwiftUI 안에 RN 뷰를 넣을 수도 있어요. (https://docs.expo.dev/guides/expo-ui-swift-ui/)
- `react-native-screens`는 네이티브 내비게이션 원시 요소(iOS `UINavigationController` 계열)를 RN에 제공해요. 네이티브 화면을 RN 스택의 한 화면으로 넣는 공식 가이드는 찾지 못했어요(**미확인**). 실무에서는 "네이티브 뷰를 꽉 채운 RN 화면" 형태가 일반적이에요(추정).

**(3) 화면 단위 이전은 현실적인가**

- 기술적으로는 가능해요. 다만 경계마다 패키징·내비게이션·공유 상태·릴리스 설정 비용이 계속 붙고, Expo 쪽 수단은 alpha예요.
- Shopify처럼 큰 팀도 "한 앱 안에서 섞기"가 아니라 "화면별로 옮겨 새 앱을 통째로 교체"를 골랐어요. 1인 개발이라면 **혼합 운영 기간을 길게 갖는 것보다, 에이전트로 그린필드를 빠르게 만들고 한 번에 교체**하는 쪽이 운영 부담이 적을 가능성이 커요(추정).
- 혼합이 유효한 경우: 특정 화면 하나(예: 차트, 위젯 설정, 성능이 중요한 리스트)만 네이티브로 바꾸고 싶을 때는 (2)번 방식이 가장 싸요.

### 3.3 옮길 때 무엇이 남고 무엇을 다시 쓰나

| 구성 요소 | 네이티브 이전 시 | 메모 |
|---|---|---|
| UI 컴포넌트 | **재작성** | SwiftUI/Compose로 새로. 디자인 토큰(색·간격·타이포)은 JSON 등으로 빼 두면 재사용 가능 |
| 내비게이션 | **재작성** | 라우트 목록·딥링크 URL 규칙은 문서로 남겨 두면 그대로 옮김 |
| 클라이언트 상태(Zustand 등) | **재작성** | 상태 모양(타입)과 전이 규칙은 스펙으로 옮길 수 있음 |
| 서버 상태 캐시(TanStack Query) | **재작성** | 쿼리 키·무효화 규칙은 문서화 가능 |
| API 클라이언트 | **생성기로 재생성 가능** | OpenAPI 문서가 있으면 Swift는 `apple/swift-openapi-generator`, Kotlin은 `OpenAPITools/openapi-generator` |
| 검증 스키마(zod) | **부분 이전** | zod는 JSON Schema 내보내기를 지원(https://zod.dev/json-schema). 서버가 최종 검증을 하면 클라이언트 검증은 UX용으로만 다시 쓰면 됨 |
| 비즈니스 로직(금액 계산, 집계, 할부·수수료 등) | **서버에 있으면 그대로**, 클라이언트에 있으면 재작성 | 가장 비싼 부분. 서버로 몰아 두는 게 핵심 |
| 테스트 | 단위 테스트는 서버 쪽만 남음. E2E 시나리오(사용자 흐름)는 스펙으로 재사용 | Shopify도 "같은 체크포인트 스크린샷·이벤트 비교"로 동등성 확인 |
| 분석 이벤트·푸시 토큰·로그인 세션 | **이름·형식 유지 필수** | Shopify가 이전 우선순위로 둔 항목 |

**지금 해 두면 나중 이전이 싸지는 선택**

- **얇은 클라이언트**: 금액 계산·집계·권한(공용/개인 지출 가시성)·검증을 서버 API에 둬요. 앱은 "보여 주고 입력받는" 역할만.
- **API 계약을 기계가 읽는 형태로**: 서버 TS 코드에서 OpenAPI를 생성하고(예: zod 스키마 기반), 그 문서를 단일 원천으로 둬요. 지금은 TS 타입 공유, 나중엔 Swift/Kotlin 클라이언트 생성.
- **서버 응답을 "화면에 바로 쓰는 모양"으로**: 표시용 포맷(통화·날짜)은 클라이언트가 하되, 숫자 계산은 서버 결과를 그대로 쓰게 해요.
- **디자인 토큰 분리**: 색·간격·폰트 크기를 JSON 한 곳에 두면 SwiftUI/Compose 테마로 변환하기 쉬워요.
- **화면·흐름 스펙 문서**: 화면별 상태·에러·빈 화면을 적어 두면(이미 `SCREEN_PRIMITIVES.md`가 그 역할), 에이전트가 참조할 "스펙"이 돼요. Shopify가 말한 "shared specs, tests, review checkpoints"와 같은 맥락이에요.
- **로직을 UI 밖으로**: 클라이언트에 남는 로직은 React 훅 안이 아니라 순수 TS 모듈로 두면, 이전 시 그대로 읽고 옮기기 쉬워요. Shopify도 비즈니스 로직을 헤드리스로 돌리게 분리했어요.

### 3.4 다른 공개 사례 (2024–2026)

- **Coinbase (RN → 네이티브, 미확인)**: 2020년 RN으로 전면 재작성한 사례가 공식 블로그에 있어요(https://www.coinbase.com/blog/announcing-coinbases-successful-transition-to-react-native). 2026년에는 리테일 앱을 Swift·Kotlin으로 그린필드 재작성한다는 채용 공고와 Reddit 글이 있지만 **Coinbase 공식 발표는 찾지 못했어요.**
- **Discord가 RN을 떠난다**는 2차 블로그 주장도 있었지만 1차 출처를 찾지 못해서 제외했어요.
- **네이티브 → RN 방향**: 2025–2026년 이름 있는 회사의 공개 회고는 찾지 못했어요. Callstack 같은 벤더 글이 대부분이고, 요지는 "기존 앱이 계속 진화해야 하면 브라운필드, 전환을 예행연습할 수 있으면 그린필드, 그리고 옮긴 뒤 관용적인 코드로 다시 다듬는 2차 작업이 필요"예요. (https://www.callstack.com/blog/migration-to-react-native-in-2026-starts-with-a-delivery-question)
- 공통 교훈: (1) 원샷 자동 변환은 안 되고 작은 체크포인트 + 시각·동작 비교가 필요해요. (2) 대상 플랫폼 전문 지식이 리뷰에 필수예요. (3) 사용자 입장에서 "평범한 업데이트"가 되도록 세션·푸시·이벤트를 유지해야 해요.

## 4. oat에 대한 시사점

- 스택 결정(Expo 추천)은 바뀌지 않아요. Exact는 pre-alpha이고 Android 포팅 일정을 감당할 수 없어요.
- "나중에 네이티브로 갈 수도 있다"는 가능성은 **지금 서버를 두껍게, 앱을 얇게 만드는 것**으로 대비해요. 이건 Expo를 쓰든 안 쓰든 이득이에요.
- 특정 화면만 네이티브 품질이 필요해지면 Expo UI(SwiftUI)나 Expo Modules 네이티브 뷰로 그 화면만 바꾸는 게 가장 싸요.
- 전면 이전이 필요해지면 Shopify식 그린필드(기존 RN 앱을 참조 스펙으로) + 한 번에 교체를 기본안으로 봐요.

## 5. 확인하지 못한 것

- Exact를 기존 Expo/RN 앱 안에 화면 단위로 넣을 수 있는지(공식 경로가 없다는 것까지만 확인).
- Exact Android의 정식 지원 시점, 1.0 일정.
- Exact로 만든 앱의 App Store 심사 통과 사례(README상 서명 IPA 생성까지는 있음, EAS 워커 제출 검증은 할 일로 남아 있음).
- `expo-brownfield`에서 네이티브가 특정 RN 라우트를 여는 방법, 여러 RN 진입점 지원.
- `react-native-screens` 스택 안에 순수 네이티브 화면을 넣는 공식 가이드.
- Coinbase·Discord의 네이티브 회귀에 대한 1차 발표.

## 출처

- Charlie Cheever, "A preview of Exact" (2026-11-09): https://ccheever.expo.app/
- Exact 저장소 README·문서: https://github.com/expo/exact (`README.md`, `docs/reference.md`, `docs/recipes/mobile-build.md`, `QUEUE.md`)
- Cheever X 게시물: https://x.com/ccheever/status/2119764253242695754 , Expo X 게시물: https://x.com/expo/status/2119805185967169720
- Expo 블로그, "An early look at Expo Modules 2.0" (2026-09-08): https://expo.dev/blog/an-early-look-at-expo-modules-2-0
- Shopify, "Native is now the future of mobile at Shopify" (2026-09-10): https://shopify.engineering/back-to-native
- Shopify, "Migrating Shop app from React Native to native" (2026-09-10): https://shopify.engineering/shop-app-migration
- Expo 브라운필드 문서: https://docs.expo.dev/brownfield/overview/ , https://docs.expo.dev/versions/latest/sdk/brownfield/
- Expo UI SwiftUI: https://docs.expo.dev/guides/expo-ui-swift-ui/
- Callstack react-native-brownfield: https://github.com/callstack/react-native-brownfield
- Callstack 이전 전략 글(벤더): https://www.callstack.com/blog/migration-to-react-native-in-2026-starts-with-a-delivery-question
- swift-openapi-generator: https://github.com/apple/swift-openapi-generator , openapi-generator: https://github.com/OpenAPITools/openapi-generator , zod JSON Schema: https://zod.dev/json-schema
- Coinbase 2020 RN 전환: https://www.coinbase.com/blog/announcing-coinbases-successful-transition-to-react-native
- 2차(참고만): daily.dev 요약 https://daily.dev/posts/expo-s-ceo-just-built-a-react-native-alternative-ys3pasiha
