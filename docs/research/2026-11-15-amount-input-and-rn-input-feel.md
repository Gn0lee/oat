# 금액 입력 패턴과 React Native 입력 체감 리스크

- 조사일: 2026-11-15
- 관련 티켓: 앱 스택 PoC: 가계부 입력 화면 직접 써보기, 선행 조사 `2026-11-11-mobile-app-stack.md`
- 전제: iOS 우선, Expo(React Native, New Architecture, CNG + 로컬 Xcode 빌드, EAS 없음). PoC 범위는 "지출 1건 기록" 화면 하나예요(금액 입력, 결제수단·카테고리 바텀시트, 메모, 저장).
- 방법: 공식 문서, 라이브러리 GitHub 이슈·PR·릴리스, 앱스토어 페이지, 회사 공식 블로그만 근거로 썼어요. 1차 자료로 확인하지 못한 항목은 "미확인", 근거 없이 판단한 항목은 "추론"으로 표시했어요. 앱 화면을 직접 열어보지는 못했어요.

## 1. 결론 먼저

- **금액 입력은 앱이 그린 커스텀 키패드가 국내 금융 앱의 주류로 보여요.** 1차 자료로 확인한 건 토스(앱 실행 직후 숫자 키패드, TDS `NumberKeypad`), YNAB(연산자 키가 붙은 숫자 패드), 편한가계부·Patterner(앱 내 계산기, `00` 키) 정도예요. 나머지 앱은 문서로 확인하지 못해서 **기기에서 직접 확인해야 해요.**
- **PoC는 커스텀 키패드로 가는 게 맞아요.** 단위 표시(만/억), 빠른 금액 버튼, `00` 키, 계산기 연산자를 시스템 숫자 패드로는 넣기 어렵고, 시스템 패드에는 iOS `number-pad`/`decimal-pad`에 쉼표나 단위 키가 없어요. 대신 VoiceOver 지원은 직접 만들어야 해요.
- **RN에서 진짜로 테스트해야 하는 리스크는 두 가지예요.**
  1. **iOS Fabric의 TextInput 한글(CJK) 입력 문제**가 여전히 열려 있어요. 메모 필드에 바로 걸려요.
  2. **바텀시트 안 스크롤 리스트와 시트 드래그의 충돌**이 라이브러리마다 열린 버그로 남아 있어요.
- 키보드 회피(react-native-keyboard-controller), 네이티브 스택 전환, 햅틱은 사실상 해결된 영역이에요. 콜드 스타트는 절대 수치가 공개된 게 없어서 PoC에서 재기만 하면 돼요.

## 2. A. 실제 앱의 금액 입력 방식

### 2.1 앱별 정리

| 앱 | 방식 | 부가 기능 | 근거 수준 |
|---|---|---|---|
| 토스 (송금) | 커스텀 숫자 키패드 | 원 단위 포맷, 최대 금액 제한(TDS 예제). 만원 단위 힌트·빠른 금액 버튼은 **미확인** | 공식 블로그 + TDS 문서 |
| 카카오뱅크 (이체) | **미확인** | +1만/+5만 같은 버튼 여부 **미확인**. 2025-11 "AI 이체"(자연어로 "엄마 10만원")는 있음 | 언론 보도만 |
| 뱅크샐러드 (수동 입력) | **미확인** | 미확인 | 공식 도움말 못 찾음 |
| 편한가계부 = Money Manager (Realbyte) | 앱 내 계산기 기능 | 계산기(금액 입력 오른쪽 위 버튼), 문자(SMS) 복사-붙여넣기 입력, 빠른 입력 위젯 | 앱스토어 페이지 |
| Patterner (국내 가계부) | 앱 내 계산기 | `00` 버튼(설정에서 켜야 함), 입력 중 쉼표 표시, 마이너스 금액 | 앱스토어 업데이트 내역 |
| 네이버페이 가계부 | **미확인** | 미확인 | 자료 못 찾음 |
| YNAB | 숫자 패드 + 연산자 | ＋ − × ÷ 와 = 키로 계산 결과 확인 후 저장 | 공식 도움말 |
| Monzo | **미확인** | 금액 추천(amount suggestions) 있음. 금액 입력은 결제 화면 두 번째 요소로 고정 | 공식 블로그 |
| Revolut, Cash App | **미확인** (커스텀 키패드라는 게 널리 알려져 있지만 1차 자료 없음) | 미확인 | — |

### 2.2 근거

- **토스**: 2019-02-01 리뉴얼 소개 글에 "토스 앱을 실행하자 마자 나타나는 숫자 키패드를 통해 이체 금액을 바로 입력할 수 있고"라고 적혀 있어요. 홈이 곧 금액 입력 키패드였다는 뜻이에요. (https://toss.im/tossfeed/article/toss-logo-user-interface-renewal) 현재 홈 구조는 바뀌었을 수 있어요(미확인).
- **토스 디자인 시스템(TDS, React Native)**: `NumberKeypad`를 "숫자를 입력할 수 있는 가상 키패드"라고 소개하고, 금액·PIN 입력에 쓴다고 해요. props는 `onKeyPress(value: number)`, `onBackspacePress`, `numbers`(키 배열, 기본 1~9, 0)뿐이에요. 예제는 상태에 문자열을 쌓고 `toLocaleString()` 뒤에 "원"을 붙여 큰 글씨로 보여주고, 최대 금액을 넘는 키는 무시해요. 문서에는 `00` 키와 접근성 설명이 없어요. (https://tossmini-docs.toss.im/tds-react-native/components/keypad/) 즉 **토스도 TextInput 없이 "표시용 텍스트 + 커스텀 키패드" 구조**를 쓰고, 이게 RN 컴포넌트로 제공된다는 점이 PoC에 직접 참고가 돼요.
- **편한가계부와 Money Manager는 같은 앱이에요.** 둘 다 Realbyte Inc.가 만들고 국내 스토어 이름이 "편한가계부"예요. 기능 목록에 "계산기 기능"이 있고, 영문 스토어 설명에는 "calculator function (Amount > upper right button)"이라고 적혀 있어요. "금융권의 200여가지 문자(SMS) 양식을 분석하여, 복사-붙여넣기로 입력"도 지원해요. (https://apps.apple.com/kr/app/id560481810, https://apps.apple.com/us/app/id395153197) 키패드가 시스템 키보드인지 자체 키패드인지는 페이지에 없어서 **미확인**이에요.
- **Patterner**: 3.7.0 업데이트에 "계산기에서 '00' 버튼을 사용 할 수 있습니다(앱내 설정에서 해당 기능 활성화 필요)", "금액 입력시에도 콤마가 표시됩니다"가 있어요. (https://apps.apple.com/kr/app/id1056120767) 국내 가계부에서 `00` 키와 실시간 쉼표가 실제 요구사항이라는 근거로 쓸 수 있어요.
- **YNAB**: Inflow/Outflow/Budgeted 필드에서 숫자 패드 오른쪽에 −, ＋, = 가 나오고 거래 입력 때는 ×, ÷ 도 쓸 수 있어요. 모바일에서는 = 를 눌러 결과를 확인한 뒤 저장해요. 시스템 키보드인지 자체 패드인지는 문서에 없어요. (https://support.ynab.com/en_us/using-the-calculator-an-overview-Sy52riYRc.md)
- **Monzo**: 2024-07-03 "Delightful Payments" 글에서 결제 화면 요소 순서를 내비게이션 바 → 금액 입력 → 참조 입력으로 고정했다고 해요. 금액 추천 로딩 실패가 결제를 막지 않도록 비차단 호출로 나눴다고도 해요. 키패드 방식은 언급이 없어요. (https://monzo.com/blog/delightful-payments/) 커뮤니티에서는 충전 화면이 £5/£10 단위 증감 버튼 중심이라는 불만이 있었어요(사용자 글이라 참고만).
- **카카오뱅크**: 2025-11 AI 이체 보도만 확인했어요. 금액 입력 화면 자체는 자료가 없어요. (https://www.heraldk.com/article/2025112317191945767)

### 2.3 커스텀 키패드를 고르는 이유와 단점

장점(대부분 추론, TDS 사례로 일부 뒷받침):
- 화면 진입과 동시에 키패드가 떠 있어서 시스템 키보드가 올라오는 애니메이션과 레이아웃 점프가 없어요. 토스가 "실행하자마자 키패드"를 내세운 이유와 같아요.
- `00`/`000`, 만·억 단위 힌트, +1만/+5만 빠른 버튼, 계산기 연산자를 자유롭게 넣을 수 있어요. iOS `number-pad`/`decimal-pad`에는 이런 키가 없어요. RN 공식 문서 기준 `keyboardType`의 공용 값은 `number-pad`, `decimal-pad`, `numeric` 등이고 확장 키는 없어요. (https://reactnative.dev/docs/textinput)
- 키 크기와 배열이 기기·키보드 설정과 상관없이 같아요.
- TextInput이 없으니 커서·선택·붙여넣기 같은 텍스트 편집 상태를 관리할 필요가 없어요. 금액은 숫자 상태 하나로 끝나요.

단점:
- **VoiceOver를 직접 챙겨야 해요.** 직접 그린 버튼에는 키보드 같은 입력 피드백이 기본으로 없어서, 각 키 `accessibilityLabel`, 입력할 때마다 현재 금액 읽어주기, 금액 표시 영역의 `accessibilityValue`를 따로 만들어야 해요. (일반 iOS 접근성 자료 기준, 이 조합을 1차 문서로 비교한 자료는 못 찾음)
- **붙여넣기가 기본으로 안 돼요.** 문자에서 금액을 복사해 붙이는 흐름(편한가계부가 강조하는 기능)을 쓰려면 길게 누르기 메뉴를 따로 만들어야 해요.
- **외부 키보드와 iPad**: 하드웨어 키보드 입력을 받으려면 별도 키 이벤트 처리가 필요해요(추론).
- 시스템 키보드가 아니라서 메모 필드로 갈 때 "키패드 숨기기 → 시스템 키보드 올리기" 전환을 직접 설계해야 해요(3.3 참고).

## 3. B. 이 화면에 걸리는 React Native 약점과 현재 상태

기준 버전: Expo SDK 58(RN 0.88, 2026-10-15). 선행 조사 문서 참고.

### 3.1 커스텀 키패드와 TextInput 지연·깜빡임 → **TextInput은 실제 리스크, 키패드는 PoC 측정 대상**

- **controlled TextInput 깜빡임은 RN 공식 문서가 아직 인정해요.** "in some cases this may cause flickering"이라고 하고, 입력을 막을 때는 JS 로직 대신 `maxLength`나 `editable={false}`를 쓰라고 해요. (https://reactnative.dev/docs/textinput)
- **Expo 가이드는 원인을 비동기 왕복으로 설명해요.** 네이티브 필드가 먼저 바뀌고 → `onChangeText` → 상태 갱신 → `value`가 다시 내려오는 사이에 상태와 다른 글자가 잠깐 보여요. New Architecture에서는 텍스트를 그대로 돌려주면 커서가 제자리에 있지만, 쉼표를 넣는 것처럼 글자 수를 바꾸면 커서 문제가 다시 생길 수 있대요. 해결책으로 `@expo/ui`의 `TextInput` + `useNativeState` + worklet `onChangeText`(SDK 56 이상, `react-native-worklets` 필요)를 권해요. "formatted value lands in the same frame as the keystroke"라고 해요. 통화 포맷 예제는 없어요. (https://docs.expo.dev/guides/controlled-components/, https://docs.expo.dev/versions/latest/sdk/ui/universal/textinput/)
- **iOS Fabric에서 빈 숫자 필드의 두 번째 키가 사라지는 버그가 열려 있어요.** 빈 `keyboardType="number-pad"` 필드에 "28"을 빨리 치면 "2"만 남는 현상이에요. 원인은 상태 왕복 때 글자는 같은데 속성이 달라 `setAttributedText:`가 호출되며 UIKit 입력 파이프라인이 리셋되는 것이에요. (react/react-native#58904, 2026-10-07, OPEN) 관련 수정 PR #59718은 2026-11-02에 main에 머지됐지만 릴리스 포함 여부는 **미확인**이에요. 0.87/0.88 백포트 PR도 일부 열려 있어요(#59198, #59197 OPEN).
- **커스텀 키패드 자체의 탭 지연은 1차 자료가 없어요.** TextInput을 안 쓰고 `Pressable` → 상태 → `Text` 재렌더 구조라 위 TextInput 버그들은 피해요. 남는 위험은 (1) 빠르게 연타할 때 JS 스레드가 바쁘면 표시가 늦게 따라오는 것, (2) 앞 키를 떼기 전에 다음 키를 누르는 "롤오버" 입력이 RN responder 구조에서 무시될 수 있는 것이에요(추론, RN 문서는 한 번에 하나의 responder만 상정하는 API만 설명함: https://reactnative.dev/docs/gesture-responder-system). 키 입력을 `onPressIn`에서 처리하면 손을 뗄 때까지 기다리지 않아요. (https://reactnative.dev/docs/pressable)
- 완화책: 금액 표시를 TextInput이 아닌 `Text`로 하고, 키는 `onPressIn` 처리, 필요하면 react-native-gesture-handler 쪽 버튼이나 Reanimated 공유 값으로 표시를 갱신해요. react-native-keyboard-controller에는 시스템 키보드를 **대체**하는 기능은 없고, `KeyboardExtender`로 시스템 키보드 위에 버튼 줄(예: +1만/+5만)을 키보드의 일부처럼 붙이는 기능만 있어요. 안에 TextInput을 넣으면 안 돼요. (https://github.com/kirillzyusko/react-native-keyboard-controller/blob/main/docs/docs/api/views/keyboard-extender/index.mdx)

### 3.2 바텀시트 → **실제 리스크, PoC에서 꼭 테스트**

| 선택지 | 구현 | 상태 |
|---|---|---|
| `@gorhom/bottom-sheet` v5 | JS(Reanimated + Gesture Handler)로 그림 | 최신 릴리스 5.2.14가 2026-05-09로 반년째 멈춤. Reanimated 4 관련 열린 버그 다수 |
| Expo UI `BottomSheet` | SwiftUI 시트 | SDK 58 신규. 안정성 표기 없음. RN 리스트를 `RNHostView`로 넣을 수 있음 |
| `react-native-true-sheet` | iOS `UISheetPresentationController` | 4.0(2026-10-27) 레이아웃 엔진 재작성, 4.1.0(2026-11-07). 활발함 |
| react-native-screens `formSheet` (expo-router `presentation: 'formSheet'`) | iOS 네이티브 form sheet | 4.30.1 안정판, 5.0 베타 진행 중. ScrollView 관련 열린 이슈 다수 |

- **gorhom v5**: 문서상 v5는 Reanimated v3 + Gesture Handler v2 기준이고, 시트 안 스크롤은 라이브러리 전용 `BottomSheetFlatList` 등이나 RNGH의 ScrollView를 써야 제스처가 맞물려요. (https://gorhom.dev/react-native-bottom-sheet/, https://gorhom.dev/react-native-bottom-sheet/troubleshooting) 열린 이슈로 #2744(2026-08-17, 스냅 포인트 두 개 + 스크롤한 뒤 아래로 끌면 다시 위 스냅으로 튐 — 이번 화면과 같은 구성), #2799(Reanimated 4에서 스프링이 멈춘 뒤 약 200ms 더 돎), #2785(Reanimated 4.6 이상 경고), #2798(키보드 높이 1pt 차이로 키보드 표시 무시)가 있어요. 저장소 마지막 push도 2026-05-09예요. (`gh` 조회, https://github.com/gorhom/react-native-bottom-sheet/issues)
- **Expo UI BottomSheet**: iOS는 SwiftUI 시트이고 `presentationDetents`로 `'medium'`/`'large'`/비율/높이를 줘요. iOS 26에서는 기본 배경이 Liquid Glass예요. `FlatList`·FlashList를 `RNHostView` 안에 넣으면 detent가 높이를 정하고 리스트가 그 안에서 스크롤된대요. 시트 위에 시트를 띄우려면 첫 시트 안에 중첩해야 해요. 안정성 단계 표기는 없어요. (https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/bottomsheet/)
- **true-sheet**: iOS에서 Apple 지도·사진 앱과 같은 `UISheetPresentationController`를 쓰고, 레이아웃 상태를 C++(Fabric shadow node)에서 공유해 시트와 같은 프레임에 내용 크기가 바뀐대요. 키보드가 올라오면 시트와 스크롤이 자동으로 비켜준대요. (https://sheet.lodev09.com/) 다만 최근 iOS 열린 이슈로 #1025(2026-11-14, 키보드 표시 중 footer 마운트 시 크래시)가 있어요.
- **react-native-screens formSheet**: React Navigation 문서상 native stack의 `formSheet`는 iOS form sheet 모달 스타일이고 `sheetAllowedDetents`로 `'fitToContents'`나 비율 배열을 줘요. (https://reactnavigation.org/docs/native-stack-navigator/) Expo Router 문서는 `fitToContents`에 명시적 크기가 필요하고 `flex: 1`은 안 된다고 해요. (https://docs.expo.dev/router/advanced/modals/) 열린 iOS 이슈로 #4769(네이티브 헤더가 있으면 ScrollView가 시트 전체 높이로 잡혀 마지막 줄이 안 보임), #3634(Fabric에서 ScrollView가 직계 자식이 아니면 크기 깨짐), #2693(중첩 ScrollView 깨짐)이 있어요.
- 판단: 결제수단·카테고리 목록이 길어지면 "시트 드래그 vs 리스트 스크롤" 충돌이 체감 품질을 바로 깎아요. 네이티브 시트(true-sheet, Expo UI, formSheet)는 제스처를 UIKit이 처리해서 원리상 유리하지만 각자 레이아웃 버그가 남아 있어요. **PoC에서 최소 두 가지(네이티브 계열 1개 + gorhom)를 같은 데이터로 비교해야 해요.**

### 3.3 키보드 회피와 키패드·시스템 키보드 전환 → **회피는 해결, 전환은 PoC에서 확인**

- Expo 키보드 가이드는 RN 기본 `KeyboardAvoidingView`가 "requires platform-specific configuration and is not very customizable"라고 하고, Android edge-to-edge에서는 창이 줄지 않아 `behavior`를 꼭 줘야 하며 `pan`과 `padding`을 같이 쓰면 두 번 올라간다고 해요. 복잡한 화면은 react-native-keyboard-controller를 권해요. (https://docs.expo.dev/guides/keyboard-handling/)
- react-native-keyboard-controller는 Expo SDK 문서에 올라가 있고(권장 버전 1.22.7, Expo Go 포함), 최신 릴리스는 1.23.0(2026-11-05)이에요. (https://docs.expo.dev/versions/latest/sdk/keyboard-controller/) 사실상 커뮤니티 표준으로 봐도 돼요.
- **전환 흐름은 직접 만들어야 해요.** 금액 키패드(앱이 그린 뷰)에서 메모(시스템 키보드)로 넘어갈 때 키패드를 내리고 키보드를 올리는 두 애니메이션이 겹치지 않게 맞춰야 해요. keyboard-controller의 키보드 높이·진행률 훅으로 키패드 높이를 키보드에 맞춰 줄이는 식이 가능하지만(추론), 이 패턴을 다룬 공식 예제는 못 찾았어요. RN `TextInput`의 `showSoftInputOnFocus={false}`로 시스템 키보드 없이 포커스만 주는 방법도 있어요. (https://reactnative.dev/docs/textinput)
- 바텀시트 라이브러리마다 자체 키보드 처리가 있어서(gorhom #2798, true-sheet #1025) **시트 안 검색 입력 + 키보드** 조합도 같이 확인해야 해요.

### 3.4 화면 전환 → **해결**

- React Navigation 문서: "The Native Stack navigator uses the native APIs `UINavigationController` on iOS and `Fragment` on Android." (https://reactnavigation.org/docs/native-stack-navigator/) expo-router의 Stack은 이 native stack 위에 있어요. 푸시·스와이프 백은 진짜 UIKit 전환이에요.

### 3.5 Hermes 콜드 스타트 → **리스크 낮음, 수치는 PoC에서 측정**

- RN 0.84(2026-02-11)부터 Hermes V1이 기본이고, iOS는 미리 컴파일된 RN 코어 바이너리를 기본으로 받아요. 공식 글에 시작 시간 수치는 없어요. (https://reactnative.dev/blog/2026/02/11/react-native-0.84)
- Software Mansion이 New Expensify 앱으로 잰 Hermes V1 개선폭은 iOS 기준 TTI 약 2.5%, 번들 로드 약 9%, 첫 마운트→전체 렌더 약 7.5%예요(2025-10-08, 기기 미기재). (https://swmansion.com/blog/welcoming-the-next-generation-of-hermes-67ab5679e184)
- Hermes는 빌드 때 바이트코드로 컴파일해서 시작이 빨라진다고 해요. (https://reactnative.dev/docs/0.84/hermes)
- **iOS 절대 콜드 스타트 수치(ms)는 1차 자료를 찾지 못했어요.** 개발 빌드는 느리니 반드시 Release 빌드로 재야 해요.

### 3.6 햅틱 → **해결 (지연 우려 작음)**

- `expo-haptics`의 iOS 구현은 호출마다 `UIImpactFeedbackGenerator`(또는 Notification/Selection)를 만들고 `prepare()` 직후 바로 발생시키며, `@MainActor`로 메인 스레드에서 돌아요. 반환값은 Promise예요. (https://github.com/expo/expo/blob/main/packages/expo-haptics/ios/HapticsModule.swift, https://docs.expo.dev/versions/latest/sdk/haptics/)
- 미리 `prepare()`해 두는 API가 없어서 엔진 예열 이점은 없어요. 키 하나당 한 프레임 안팎의 지연이 있을 수 있지만 수치 자료는 없어요(추론).
- iOS에서 저전력 모드, 설정에서 햅틱 끔, 카메라·받아쓰기 활성 중에는 동작하지 않아요. (https://docs.expo.dev/versions/latest/sdk/haptics/)

## 4. 한글 입력: 메모 필드의 숨은 리스크

- react/react-native#56463(2026-04-16, OPEN): "CJK IME input is fundamentally broken on iOS Fabric — affecting all New Architecture users since 0.76". 조합 밑줄이 안 보이거나, 조합 중 글자가 깨지거나, `maxLength`가 한글 조합(ㅎ→하→한)을 중간에 자르거나, controlled `value`가 조합을 방해한다는 내용이에요. 댓글에 "이 문제 때문에 업그레이드를 미뤘다"는 사례가 있어요. 관련 #48497(2025-01-05, OPEN), 수정 PR #56082(2026-03-13, OPEN)도 있어요.
- RN 소스의 텍스트 비교 함수에는 이미 "Korean input" 예외가 있다고 #58904가 언급해요. 즉 한국어는 일부 대응돼 있지만, `maxLength`와 controlled `value` 조합은 여전히 위험해요.
- **대안**: 메모를 `@expo/ui` `TextInput`(iOS에서 SwiftUI `TextField`)으로 만들면 RN `RCTTextInputComponentView` 경로를 안 타요. 한글 조합이 정상일 가능성이 높지만 문서 근거는 없어요(추론, PoC에서 확인).

## 5. PoC 설계 제안과 합격 기준

1. **금액 입력**: TDS처럼 "큰 `Text` + 커스텀 키패드". `00` 키, 실시간 쉼표, 만/억 힌트("12,000원 · 1만 2천원"), +1만/+5만/+10만 버튼, 백스페이스 길게 누르기. 키 입력은 `onPressIn`.
   - 기준: 두 손가락으로 빠르게 번갈아 20번 탭해서 누락 0회, 탭→표시 반영이 눈으로 느껴지지 않음(가능하면 화면 녹화 240fps로 프레임 수 측정), VoiceOver로 금액 입력 가능.
2. **바텀시트**: 결제수단·카테고리 각 30개 이상 리스트. true-sheet(또는 Expo UI BottomSheet)와 gorhom v5를 같은 화면에서 비교.
   - 기준: 리스트를 끝까지 스크롤한 뒤 아래로 끌어서 닫기, 중간 detent 이동이 의도대로 동작(gorhom #2744 재현 여부), 60fps 유지, 시트 안 검색창 + 키보드에서 크래시·겹침 없음.
3. **메모(한글)**: RN `TextInput`과 `@expo/ui` `TextInput` 두 개를 놓고 "안녕하세요 오늘 점심" 같은 문장을 빠르게 입력, `maxLength` 걸고 끝 글자 조합.
   - 기준: 글자 누락·중복·조합 깨짐 0회.
4. **키패드↔키보드 전환**: 금액 → 메모 → 금액으로 왕복할 때 레이아웃 점프 없음, 저장 버튼이 항상 보임.
5. **전환·시작·햅틱**: expo-router Stack 푸시, Release 빌드 콜드 스타트(실기기, 3회 평균), 키마다 `selectionAsync`.
   - 기준: 콜드 스타트 수치를 기록만 하고(비교 대상은 Flutter PoC 또는 기본 SwiftUI 앱), 키 햅틱이 표시보다 늦게 느껴지지 않음.

## 6. 확인하지 못한 것

- 카카오뱅크, 뱅크샐러드, 네이버페이 가계부, Revolut, Cash App의 금액 입력 방식(시스템 키보드인지 커스텀인지, 빠른 금액 버튼·단위 힌트 유무). 실기기에서 화면을 직접 확인해야 해요.
- 토스 송금 화면의 현재 만원 단위 힌트·빠른 금액 버튼 유무
- 편한가계부·YNAB 숫자 패드가 시스템 키보드 기반인지 자체 키패드인지
- RN #59718 수정이 포함된 릴리스 버전, Expo SDK 58의 RN 패치 버전에 들어갔는지
- Expo UI `BottomSheet`·`TextInput`의 안정성 단계(문서에 표기 없음)
- iOS Hermes 콜드 스타트 절대 수치, 커스텀 키패드 탭 지연 실측 자료
- 커스텀 키패드 VoiceOver 구현 모범 사례에 대한 Apple 1차 문서
