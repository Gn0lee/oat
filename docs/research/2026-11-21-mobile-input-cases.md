# 모바일 입력 UX 사례 조사

- 조사일: 2026-11-21
- 관련 티켓: 모바일 입력 UX 원칙: 금액 입력·최근 항목·바텀시트·종목 검색
- 선행 조사: `2026-11-15-amount-input-and-rn-input-feel.md`(금액 입력 앱별 표, RN 입력 리스크), `2026-11-21-stats-screens-cases.md`(홈·통계 사례). 두 문서에 있는 내용은 되풀이하지 않고 링크만 걸었어요.
- 전제: Expo SDK 58(RN 0.88, New Architecture), expo-router, iOS 우선, 다크 모드. 하단 탭은 홈·기록·분석·자산 4개, 금액은 앱이 그린 숫자 키패드로 확정이에요.
- 방법: 공식 문서·공식 블로그·공식 도움말·앱스토어 페이지를 우선 근거로 썼어요. 앱을 직접 열어보지는 못했어요.
- 표기: **[1차]** 공식 자료 원문에서 확인, **[2차]** 검색 요약·리뷰·사용자 글로만 확인(원문이 막혀 있었던 경우 포함), **미확인** 공개 자료로 확인 못 함, **추론** 근거 없이 판단한 것.

## 1. 결론 먼저

> 아래 표의 "oat 추천"은 조사 시점의 제안이에요. 최종 결정은 [모바일 입력 UX 원칙](../design/mobile-input.md)이고, 추가 버튼(홈·기록 탭의 떠 있는 +), 입력 흐름(퍼널), 빠른 금액 버튼(뺌), 분할(첫 줄이 차액을 맞춤)은 이 표와 달라요.

| 질문 | 요약 | oat 추천 |
|---|---|---|
| A. 추가 버튼 위치 | Apple HIG는 "탭 바는 이동용이지 액션용이 아니다"라고 분명히 말해요. 해외 가계부는 탭 바 가운데 +가 아니라 **목록 화면 안의 + 버튼**(Copilot 오른쪽 아래, YNAB 각 탭 아래쪽 버튼, Rocket Money 메뉴)을 써요. expo-router NativeTabs는 탭을 버튼처럼 쓰는 핸들러를 문서에 두지 않아요. | 탭 바 가운데 +는 만들지 않아요. **"기록" 탭 화면 안에 큰 추가 버튼**을 두고, 홈에도 같은 진입점을 하나 더 둬요. 길게 누르기·위젯·단축어 같은 보조 진입점은 나중에 붙여요. |
| B. 입력 흐름 | YNAB·Copilot 모두 **금액 먼저**, 이후 한 화면에서 나머지를 고쳐요. 단계를 강제로 넘기는 위저드는 1차 자료로 못 찾았어요. 편한가계부는 저장 대신 **"계속" 버튼**으로 연속 입력을 지원해요. | 금액 키패드가 먼저 뜨고, 그 아래에 기본값이 채워진 줄들(장부·결제수단·카테고리·날짜)을 한 화면에 둬요. 저장 버튼 옆에 "계속 입력"을 두고, 저장 뒤에는 되돌리기 토스트를 띄워요. |
| C. 금액 부가 기능 | 토스·카카오뱅크·뱅크샐러드의 만/억 힌트·빠른 버튼은 이번에도 **1차 자료로 확인 못 했어요.** Apple HIG는 붙여넣기 지원을 권하고, iOS 16부터 코드로 클립보드를 읽으면 허락 알림이 떠요. | 만/억 힌트와 `00` 키는 넣고, 빠른 금액 버튼은 PoC에서 써 보고 정해요. 붙여넣기는 금액 영역 길게 누르기 메뉴로 사용자가 직접 할 때만 읽어요. |
| D. 최근 항목 재사용 | YNAB은 **가맹점(payee)이 마지막 카테고리를 기억**하고, 모바일에서 최근 카테고리 5개를 제안해요. 위치 기반으로 가맹점·카테고리·계좌까지 채우기도 해요. 편한가계부는 **즐겨찾기(북마크)**로 기록을 통째로 저장하고 불러올 때 날짜를 지금으로 바꿔요. | 가맹점 이름 자동완성 → 그 가맹점의 마지막 카테고리·결제수단 채우기를 기본으로 해요. "최근 기록 복제(날짜는 오늘)"를 기록 상세에 둬요. 템플릿은 나중에. |
| E. 카테고리 분할 | YNAB은 **"Remaining(남은 금액)"**을 보여주고, Done을 누를 때 남으면 자동 분배를 제안하거나 남은 금액을 눌러 한 줄에 넣게 해요. Copilot은 합이 안 맞으면 **저장 버튼을 막고**, 한 줄을 고치면 나머지가 따라 바뀌어요. | 분할 화면 맨 위에 "남은 금액"을 크게 두고, 남은 금액을 누르면 선택한 줄에 넣어요. 합이 안 맞으면 저장을 막되, 왜 막혔는지 문장으로 보여줘요. |
| F. 매매 기록·종목 검색 | Sharesight는 **매매일 종가를 단가 칸 아래에 제안**하고 누르면 채워요(환율도 같은 방식). Copilot은 소수점 수량을 지원해요. 국내 증권사 앱의 초성 검색은 **1차 자료로 확인 못 했어요.** | oat 웹은 이미 초성 검색을 지원해요(`EXAMPLES.md`, `PRD.md` STOCK-HD-02). 앱에서도 유지해요. 단가 칸에 "그날 종가" 제안을 두고, 수량은 해외 주식만 소수점 키를 보여줘요. |
| G. VoiceOver | App Store 평가 기준이 **"커스텀 키보드·PIN 입력 위젯도 VoiceOver로 조작 가능해야 한다"**, **"드래그 앤 드롭은 커스텀 액션으로도 제공하라"**고 적어요. 접근성 영양 라벨은 9개 항목이고 지금은 자율이지만 나중에 의무가 된다고 해요. | 키패드 키마다 `accessibilityRole="keyboardkey"`, 입력 뒤 현재 금액을 `announceForAccessibilityWithOptions`로 읽어줘요. 재정렬은 "위로 이동/아래로 이동" 커스텀 액션. 출시 때 라벨은 **다크 인터페이스·VoiceOver·더 큰 텍스트·색에만 의존하지 않음**을 목표로 잡아요. |
| H. Dynamic Type | Apple은 **잘림 최소화, 큰 크기에서 가로 배치를 세로로 바꾸기**를 권해요. `adjustsFontSizeToFitWidth`는 한 줄 라벨용이라고 해요. 탭 바처럼 키울 수 없는 곳은 Large Content Viewer를 쓰라고 해요. | 금액 헤드라인은 한 줄 + `adjustsFontSizeToFit` + `minimumFontScale`로 줄이고, 키패드 키는 `maxFontSizeMultiplier`로 상한을 둬요. AX 크기에서는 목록 줄을 세로 배치로 바꿔요. |
| I. 콜드 스타트 | Apple WWDC19: **"첫 프레임 400ms 안"**. watchdog은 문서 예시에서 약 20초(19.97초)에 강제 종료해요. Organizer·MetricKit은 **첫 프레임까지**를 재요. Expo는 콜드 1.5초·웜 0.5초·TTI 3초를 목표로 제시해요. | 목표를 두 개로 나눠요. ① 첫 프레임(Organizer 기준) p50 400ms대, ② "기록 탭에서 키패드 누를 수 있음"까지 TTI p75 1.5초 이하. Release 빌드 실기기로 재요. |
| J. 오프라인·저장 실패 | YNAB·Copilot·Monarch의 오프라인 대기열은 **공식 문서로 확인 못 했어요.** TanStack Query는 오프라인 mutation을 일시정지해 두었다가 재연결 때 순서대로 재시도하고, 앱 재시작 뒤에도 이어가려면 `setMutationDefaults` + persist + `resumePausedMutations`가 필요하다고 문서에 있어요. | 기록 저장은 TanStack Query offline mutation으로 대기열에 넣고, 목록에 "보내는 중" 상태로 바로 보여줘요. 재시작 뒤 재개까지 지원하되, 중복 저장을 막기 위해 클라이언트가 만든 id로 저장해요(추론). |

## 2. A. 기록 추가 버튼 위치

### 2.1 Apple 지침

- HIG Tab bars: **"Use a tab bar to support navigation, not to provide actions."** 현재 화면에 대한 동작은 툴바를 쓰라고 해요. [1차] https://developer.apple.com/design/human-interface-guidelines/tab-bars
- 같은 문서: 탭 바는 다른 섹션으로 갈 때도 보여야 하고, 예외는 모달이 탭 바를 덮을 때예요("a modal is temporary and self-contained"). 기록 입력 화면을 모달(시트)로 띄우면 탭 바를 가려도 지침에 맞아요. [1차] 같은 URL
- iOS 26 Liquid Glass: 탭 바가 콘텐츠 위에 떠 있고, 붙은 액세서리(Music의 MiniPlayer 같은)가 있으면 스크롤할 때 탭 바를 줄이고 액세서리를 한 줄로 합칠 수 있어요. 탭 바 끝에 전용 검색 탭을 둘 수 있어요. [1차] 같은 URL
- 탭은 5개 이하를 권하고, 아이콘은 SF Symbols 채운 모양을 권해요. [1차] 같은 URL

### 2.2 expo-router NativeTabs

- SDK 58부터 `expo-router/native-tabs`로 가져와요(SDK 54~57은 `unstable-native-tabs`). iOS 26에서는 Liquid Glass가 자동 적용되고, `backgroundColor` 같은 배경 prop은 더 이상 먹지 않아요. [1차] https://docs.expo.dev/router/advanced/native-tabs/
- 지원: `role="search"` 검색 탭, bottom accessory(SDK 55+, 두 벌이 동시에 그려지므로 상태는 바깥에 둬야 함), `minimizeBehavior="onScrollDown"`, 배지. [1차] 같은 URL
- 제약: 탭을 눌렀을 때 실행할 임의의 핸들러는 문서에 없어요. 탭 안에 탭 중첩 불가, 런타임에 탭 추가·삭제 불가, 탭 바 높이 측정 불가, FlatList에서는 맨 위로 스크롤·스크롤 축소가 안 되고 탭 바가 투명하게 보일 수 있다고 해요. 자유롭게 바꾸려면 JS 탭을 쓰라고 해요. [1차] 같은 URL
- 안정성 단계(알파/베타)는 문서에 표기가 없어요. **미확인**.

### 2.3 앱 사례

| 앱 | 추가 진입점 | 근거 |
|---|---|---|
| Copilot Money | Transactions 화면 **오른쪽 아래 "+"**. macOS는 검색 버튼 옆 + | [1차] https://help.copilot.money/en/articles/4038706-creating-manual-transactions |
| YNAB | Home·Plan·Spending·Accounts 탭 **아래쪽의 Add Transaction 버튼**, 각 계좌 목록 아래. Plan에서 카테고리를 길게 눌러 추가도 가능 | [1차] https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi.md, https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg.md |
| Rocket Money | Transactions 탭 **오른쪽 위 점 세 개 메뉴 → Add Transaction** (프리미엄 전용) | [1차] https://help.rocketmoney.com/en/articles/4402227-adding-transactions-manually |
| Monarch | 계좌 화면이나 Transactions 목록의 "+", 이후 "..." 메뉴에서 Add transaction. 하단 탭은 5개 | [2차] 도움말 원문 403, 검색 요약 https://help.monarch.com/hc/en-us/articles/360058441811 · 탭 5개는 [1차] https://www.monarch.com/blog/new-mobile-navigation (2022-02) |
| Money Lover | 앱의 + 버튼, 메인 화면의 Add Transaction 버튼을 길게 누르면 AI 입력 화면. iOS 17+ 위젯에 Add Transaction 버튼 | [2차] 도움말 403, 검색 요약 https://moneylover.zendesk.com/hc/en-us/articles/36452135430425-How-to-add-widget-in-iOS |
| Spendee | 1x1 추가 위젯(안드로이드), iOS 단축어로 앱을 안 열고 추가 | [2차] Medium 403, 검색 요약 https://medium.com/spendee/how-to-save-time-adding-transactions-f5bb79f80841 |
| 편한가계부(Money Manager) | 빠른 입력 위젯. 화면 안 + 위치는 **미확인** | [1차] 위젯은 선행 문서 2.2 |
| 토스, 뱅크샐러드, 네이버페이 가계부, 후잉 | 수기 입력 진입점 **미확인**. 토스·뱅크샐러드는 연동 자동 기록이 중심이고, 토스 칼럼은 현금은 직접 적어야 한다고 말해요 | [1차] https://toss.im/tossfeed/article/3-tips-housekeeping-book |

### 2.4 oat에 대한 판단

- 탭 바 가운데 + 탭은 HIG 문장과 정면으로 부딪히고, NativeTabs로는 만들 방법도 문서에 없어요. 만들려면 JS 탭으로 내려가야 해서 Liquid Glass 탭 바를 잃어요(추론).
- 확정된 "기록" 탭이 곧 입력의 집이에요. 기록 탭 화면에 큰 추가 버튼을 두고, 입력 화면은 모달/시트로 띄워 탭 바를 덮어요. Copilot·YNAB과 같은 방식이에요.
- bottom accessory는 "지금 재생 중"처럼 늘 떠 있는 상태용이라(HIG 예시가 MiniPlayer), 추가 버튼으로 쓰는 건 지침 취지와 맞지 않아 보여요(추론).

## 3. B. 입력 흐름

### 3.1 사례

- **YNAB**: + 를 누르면 숫자 패드로 **금액 먼저**, Done → 유형(Spending/Inflow/Credit Card Payment/Transfer) 선택 → 날짜 등 확인 → Save. 이체·카드 대금은 payee와 카테고리가 필요 없어요. iOS 단축어로 금액·payee·카테고리·계좌를 미리 채울 수 있어요. "저장 후 계속"은 문서에 없어요. [1차] https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi.md
- **Copilot**: 유형(Regular/Income/Transfer) → 날짜 → 이름 → 금액(Expense/Refund) → 카테고리(기본값을 눌러 변경) → 계좌(눌러 변경) → SAVE. 카테고리·계좌는 **기본값이 이미 채워진 줄을 눌러 바꾸는** 방식이에요. [1차] https://help.copilot.money/en/articles/4038706-creating-manual-transactions
- **Rocket Money**: Spend/Income → 이름·날짜·금액·카테고리 → Save. [1차] 위 링크
- **편한가계부(Money Manager)**: 연속으로 기록하려면 저장 대신 **"계속(continue)"** 버튼을 누르라고 도움말에 있어요. 계속 뒤에 어떤 값이 남는지는 **미확인**. [2차] 도움말 403, 검색 요약 https://help.realbyteapps.com/hc/en-us/articles/360043325233-How-to-add-an-income-expense
- **토스 송금**: 금액을 먼저 입력하게 해서 송금 단계임을 분명히 했다는 분석이 있어요. [2차] https://yozm.wishket.com/magazine/detail/315/
- 단계식(금액 → 카테고리 → 결제수단으로 화면이 자동으로 넘어가는) 가계부 사례는 1차 자료로 **못 찾았어요.**

### 3.2 Apple 지침

- 기본값을 미리 채워 결정을 줄이고, 가능한 한 타이핑 대신 선택지를 주고, 입력 즉시 검증하라고 해요. 필수값이 없으면 계속 버튼을 비활성화하라고 해요. [1차] https://developer.apple.com/design/human-interface-guidelines/entering-data
- 되돌리기: 결과를 예측할 수 있게 하고, 되돌린 결과를 화면에서 보여주라고 해요. 전용 되돌리기 버튼은 꼭 필요할 때만 두라고 해요. [1차] https://developer.apple.com/design/human-interface-guidelines/undo-and-redo
- 저장 후 토스트로 되돌리기를 주는 가계부 사례는 1차 자료로 **못 찾았어요.**

### 3.3 oat에 대한 판단

- 금액 먼저 + 한 화면 폼(기본값이 채워진 줄들)이 사례와 HIG 모두와 맞아요. 단계식은 기록 하나에 필드가 많은 oat(장부, 결제수단/지갑, 카테고리 분할, 가맹점, 메모, 날짜)에서 "고칠 필요 없는 칸도 거쳐야" 하는 비용이 생겨요(추론).
- 연속 입력은 영수증 여러 장을 몰아 적는 상황에 필요해요. "계속 입력" 뒤에는 날짜·장부·결제수단을 남기고 금액·가맹점·메모만 비우는 게 자연스러워요(추론, PoC 확인).
- 되돌리기 토스트는 HIG의 "결과를 보여줘라"를 지키려면, 되돌린 뒤 목록에서 해당 줄이 사라지는 걸 보여줘야 해요.

## 4. C. 금액 입력 부가 기능

선행 문서 2장의 앱별 표에서 "미확인"이었던 항목을 다시 찾아봤어요.

| 항목 | 이번 결과 |
|---|---|
| 토스 송금 만원 단위 힌트·빠른 금액 버튼 | **여전히 미확인.** 공식 블로그·서비스 페이지에 문장이 없어요. 2차 리뷰는 송금 화면이 "전화 다이얼이나 계산기처럼" 생겼다고만 해요. [2차] https://yozm.wishket.com/magazine/detail/315/ |
| 카카오뱅크 이체 +1만/+5만/전액 | **여전히 미확인.** AI 이체(1회·1일 200만원 한도) 보도만 있어요. [2차] https://www.heraldk.com/article/2025112317191945767 |
| 뱅크샐러드 수동 입력 | **여전히 미확인.** 공식 도움말을 찾지 못했어요. |
| 네이버 가계부 | 마이너스·소수점 금액 입력, 고정항목 자동 입력을 추가했다는 보도자료(시점 미확인). [1차] https://navercorp.com/media/pressReleasesDetail?seq=28704 |
| TDS 금액 컴포넌트 | 선행 문서의 `NumberKeypad` 외에 단위 힌트 컴포넌트는 찾지 못했어요. |

붙여넣기 관련 1차 근거:

- HIG Entering data: "let people provide data by dragging and dropping it or by pasting it." [1차] https://developer.apple.com/design/human-interface-guidelines/entering-data
- iOS 16부터 코드로 클립보드를 읽으면 허락 알림이 떠요. `UIPasteControl`(시스템 붙여넣기 버튼)은 알림 없이 붙여넣어요. [1차] https://developer.apple.com/documentation/uikit/uipastecontrol
- 판단: 화면에 들어올 때 클립보드를 자동으로 읽어 금액을 제안하면 매번 허락 알림이 떠요. 길게 누르기 메뉴에서 사용자가 "붙여넣기"를 고를 때만 읽어요(추론). 붙여넣은 문자열은 숫자만 남기고 `원`, 쉼표, 공백을 지워요.

만/억 힌트, `00`/`000` 키, 연산자는 선행 문서의 YNAB(연산자), Patterner(`00`), 편한가계부(계산기) 근거 외에 새로 찾은 1차 자료가 없어요.

## 5. D. 최근 항목 재사용

| 앱 | 방식 | 근거 |
|---|---|---|
| YNAB | payee가 **가장 최근 카테고리를 기억해 자동 지정**(기본 켜짐, 새 거래에만). 모바일은 그 payee로 최근 쓴 카테고리 **5개를 제안**(새 payee·카테고리 하나뿐·분할 거래는 제외). 웹 Manage Payees에서 기본 카테고리를 고정할 수 있고, 모바일에서는 못 바꿔요 | [1차] https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks.md |
| YNAB Geo Payees | 위치 권한을 주면 저장된 위치 근처(약 500m)의 payee를 "Near You"로 위에 보여주고, **payee·카테고리·계좌를 자동으로 채워요** | [1차] https://support.ynab.com/en_us/geo-payees-on-mobile-a-guide-SJTbcVks.md |
| YNAB 단축어 | iOS 단축어로 금액·payee·카테고리·계좌 미리 채우기 | [1차] 3.1 링크 |
| 편한가계부(Money Manager) | **북마크**: 자주 쓰는 수입·지출·이체를 저장해 한 번에 입력. 누르면 입력 화면으로 가고 **날짜·시간은 지금으로 바뀜** | [1차] App Store "bookmarking" 문장 https://apps.apple.com/us/app/id395153197 · 세부는 [2차] 도움말 403 https://help.realbyteapps.com/hc/en-us/articles/360043328873-How-to-make-a-bookmark |
| 편한가계부 | 메모 칸 **자동완성**(More > Transaction Settings > Autocomplete). 카테고리까지 따라오는지는 **미확인** | [2차] https://help.realbyteapps.com/hc/en-us/articles/360043500993-How-to-set-up-autocomplete |
| Money Lover | "Duplicate transaction" 기능 도움말이 있어요. 내용은 **미확인**(403) | [2차] https://moneylover.zendesk.com/hc/en-us/articles/42475422733081-Duplicate-transaction-feature |
| Spendee | 같은 지갑의 반복 지출(예: 점심)을 1x1 위젯으로 | [2차] 2.3 링크 |
| Copilot | 수동 입력에서 카테고리·계좌가 기본값으로 채워진 줄로 나와요. 기본값이 "마지막 사용"인지는 **미확인** | [1차] 3.1 링크 |

마지막 결제수단 기억을 문서로 밝힌 앱은 **못 찾았어요.**

oat에 대한 판단:

- YNAB 방식이 oat의 "가맹점 이름(title)"과 그대로 맞아요. 가맹점 이름을 고르면 그 가맹점의 마지막 카테고리 줄과 결제수단을 채우고, 바꾼 값은 다음에 다시 학습해요.
- 부부 공용 장부에서는 "누구의 마지막 기록인가"가 문제예요. 결제수단은 사람마다 다르니 **본인 기록 기준**, 카테고리는 장부 기준이 자연스러워요(추론). 개인 장부 기록이 공용 장부 제안에 새어 나오면 안 돼요(프라이버시, 추론).
- 즐겨찾기/템플릿은 편한가계부 북마크처럼 "불러오면 날짜는 오늘"이 핵심이에요. 1차 출시엔 "기록 상세 → 복제(날짜 오늘)"로 대신하고, 템플릿은 사용 데이터를 보고 정해요.

## 6. E. 카테고리 분할 입력

- **YNAB**: 분할 화면에서 줄마다 금액을 넣어요. Done을 눌렀을 때 **"Remaining" 옆에 금액이 남아 있으면 자동 분배를 제안**해요(비율대로 나눔, 판매세 배분용). $0인 줄 하나는 자동 분배에서 빠져요. 안드로이드는 **줄을 고른 뒤 Remaining Amount를 누르면 그 줄에 남은 금액이 들어가고** Remaining이 $0.00이 돼요. [1차] https://support.ynab.com/en_us/split-transactions-a-guide-SJLEKwY0q.md
- **Copilot**: "똑같이 나누기"와 "직접 정하기(금액 또는 %)" 두 모드를 전환해요. 한 줄을 고치면 **나머지가 전체 합에 맞게 바뀌어요.** 합이 안 맞으면 **Save를 누를 수 없어요.** 원래 금액은 이름 아래에 참고로 보여줘요. [1차] https://help.copilot.money/en/articles/5325255-splitting-transactions
- **Monarch**: 모바일 거래 정보 탭이나 리뷰 카드에서 분할할 수 있고, 규칙 기반 Smart Split(고정 금액 또는 %)이 있어요. 남은 금액 표시는 **미확인**. [1차] https://www.monarch.com/review-on-the-go-and-smart-split, https://www.monarch.com/customizable-dashboard-manual-transactions
- 판단: 패턴은 세 가지예요. ① 남은 금액을 보여주고 사용자가 넣기(YNAB), ② 자동으로 맞추기(Copilot), ③ 저장 차단(Copilot). oat는 키패드로 금액을 넣으니 ①이 잘 맞아요. "남은 금액" 칩을 누르면 지금 줄에 넣고, 저장은 합이 맞을 때만 열되 차단 이유를 문장으로 보여줘요(HIG의 "필수값 전 계속 비활성화"와 맞음). Copilot식 자동 재계산은 3줄 이상에서 어느 줄이 바뀌는지 예측하기 어려워요(추론).

## 7. F. 주식 매매 기록 흐름과 종목 검색

| 앱 | 흐름 | 근거 |
|---|---|---|
| Sharesight | 보유 종목 → Trades & Income → Add trade. 유형, 매매일, 수량, **단가(매매일 종가를 칸 아래 제안, 누르면 채움)**, 해외 주식은 **환율(그날 종가 환율 제안)**, 수수료(선택). 보유 수량이 음수가 되는 매도는 저장 거부 → 날짜 순서대로 입력 권장 | [1차] https://www.sharesight.com/au/partners/add-buy-sell-trades-manually/ |
| Sharesight 소수점 | NASDAQ·NYSE 등 미국과 캐나다 시장에서 소수점 수량 지원(브로커가 허용할 때) | [1차] https://www.sharesight.com/blog/track-fractional-shares-with-sharesight/ |
| Copilot | 보유 종목 추가 시 실시간 가격이 붙은 종목 목록에서 고르고 수량 입력, **소수점 지원** | [1차] https://help.copilot.money/en/articles/6097003-tracking-holdings-with-manual-accounts |
| Yahoo Finance iOS | Portfolios → View Details → 종목 옆 Add Holdings → 거래 입력 → Add. Shares에 음수를 넣으면 공매도 | [1차] https://help.yahoo.com/kb/SLN36975.html |
| Delta | + → Add Manual Transaction | [2차] 도움말 403, https://support.delta.app/en/articles/1428126-how-to-add-a-manual-transaction |

초성 검색:

- 국내 증권사 앱의 초성 검색 지원을 밝힌 공식 자료는 **못 찾았어요.** 최근 보도는 자동완성·유의어·오타 보정(유안타 티레이더M, 2026-09), 키워드 태그 ETF 검색(키움, 2026-10), 테마 검색(토스증권) 같은 방향이에요. [2차] https://news.mtn.co.kr/news-detail/2026090810412418117, https://news.bizwatch.co.kr/article/market/2023/05/23/0046
- oat 웹은 이미 `stock_master.choseong` 컬럼으로 초성·한글·영문·티커 검색을 해요(`.claude/docs/DATABASE.md`, `.claude/docs/EXAMPLES.md`, `PRD.md` STOCK-HD-02). 앱에서도 그대로 이어가면 돼요.

oat에 대한 판단:

- Sharesight의 "그날 종가 제안"이 oat에 바로 쓸 수 있는 패턴이에요. oat에 종가 데이터가 있으니 단가 칸 아래 "11/20 종가 71,200원"을 칩으로 두고 누르면 채워요. 환율도 같은 방식이에요.
- 수량 키패드는 금액 키패드를 재사용하되, 해외 주식만 소수점 키를 보여줘요(국내는 정수, 추론).
- 매도 수량이 보유보다 크면 저장 전에 막아요(Sharesight와 같음).

## 8. G. VoiceOver

### 8.1 Apple 1차 문서

- `keyboardKey` trait: "The accessibility element behaves like a keyboard key." [1차] https://developer.apple.com/documentation/uikit/uiaccessibilitytraits/keyboardkey
- `allowsDirectInteraction`: 피아노 건반처럼 직접 터치로 다루는 요소용이에요. 숫자 키패드에는 맞지 않아요(추론). [1차] https://developer.apple.com/documentation/uikit/uiaccessibilitytraits/allowsdirectinteraction
- announcement 알림: UI가 바뀌지 않거나 잠깐만 바뀌는 이벤트를 알릴 때 써요. [1차] https://developer.apple.com/documentation/uikit/uiaccessibility/notification/announcement
- `adjustable`: 슬라이더·피커처럼 연속 조절하는 요소, `accessibilityIncrement/Decrement` 구현 필수. [1차] https://developer.apple.com/documentation/uikit/uiaccessibilitytraits/adjustable
- 커스텀 액션: VoiceOver Actions 로터에 나와요. [1차] https://developer.apple.com/documentation/uikit/uiaccessibilitycustomaction
- **App Store VoiceOver 평가 기준**(접근성 영양 라벨용) [1차] https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria
  - "Custom keyboards and text entry methods (for example, custom keyboards or PIN code entry widgets) should be operable with VoiceOver, and produce correct speech/braille output…" → oat 키패드가 정확히 이 대상이에요.
  - "Complex app behaviors, such as drag and drop … should be provided … through a custom rotor or action." → 리스트 재정렬은 커스텀 액션이 필요해요.
  - 길게 누르기·컨텍스트 메뉴도 커스텀 액션으로 제공하라고 해요.
  - 임시 상태 배너(토스트)는 `AccessibilityNotification`으로 적절히 알리라고 해요.
  - 모달이 뜨면 VoiceOver 커서가 새 내용으로 옮겨가야 하고, 뒤쪽 내용은 닿지 않아야 하며, escape(두 손가락 문지르기)로 닫을 수 있어야 해요.
  - 레이블에 "버튼" 같은 컨트롤 종류를 넣지 말고 trait으로 표현하라고 해요.

### 8.2 React Native 대응

- `accessibilityRole="keyboardkey"`: "Used when the element acts as a keyboard key." `adjustable` 역할도 있어요. [1차] https://reactnative.dev/docs/accessibility
- `accessibilityActions` + `onAccessibilityAction`: 표준 액션(`activate`, `increment`, `decrement`, iOS `magicTap`·`escape`)과 `label`이 있는 커스텀 액션. [1차] 같은 URL
- `accessibilityValue={{ text }}`: 금액 표시 영역의 현재 값. [1차] 같은 URL
- `accessibilityLiveRegion`은 **Android 전용**이라 iOS에서는 announce로 대신해야 해요. [1차] 같은 URL
- `AccessibilityInfo.announceForAccessibilityWithOptions`: iOS에서 `queue: true`로 읽던 말 뒤에 줄 세우고, `priority`(`low`/`default`/`high`)를 줄 수 있어요. iOS `announcementFinished` 이벤트도 있어요. [1차] https://reactnative.dev/docs/accessibilityinfo

oat 적용(추론):

- 키: `accessibilityRole="keyboardkey"`, 레이블은 "1", "00", "지우기". 지우기 키 길게 누르기(전체 지우기)는 커스텀 액션 "전체 지우기"로.
- 금액 표시: `accessibilityValue={{ text: "1만 2천 원" }}`. 키를 누를 때마다 `queue: true`로 새 금액을 읽어줘요. 빠르게 누르면 말이 쌓이니 짧게 끊는 디바운스가 필요해요.
- 재정렬(카테고리 줄, 홈 위젯 순서): 각 줄에 커스텀 액션 "위로 이동", "아래로 이동"(필요하면 "맨 위로"). 이동 뒤 "3번째 중 2번째" 식으로 알려줘요.
- 분할 줄 삭제, 기록 스와이프 삭제도 커스텀 액션으로.

### 8.3 접근성 영양 라벨(Accessibility Nutrition Labels)

- 항목 9개: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions. [1차] https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels
- 요건: **"users must be able to complete all of the common tasks of your app using that feature."** 공통 작업은 앱의 주 기능 + 첫 실행(온보딩 완료·건너뛰기), 로그인, 구매(있다면), 설정. 기기별로 따로 답해요. 같은 URL
- 지금은 **자율**이고, 충분한 시간을 준 뒤 새 앱·업데이트 제출에 의무화한다고 해요(날짜 없음). 라벨은 iOS 26 이상 기기에서 보여요. 잘못된 라벨은 App Review가 수정을 요청할 수 있어요(가이드라인 2.3). 같은 URL
- Larger Text 기준: 텍스트를 **200% 이상 또는 시스템 최대**까지 키울 수 있어야 해요(Dynamic Type은 AX3에서 200% 초과, AX5에서 본문 300% 초과). 읽을 수 없을 정도로 자르지 말고, 줄바꿈이나 세로 배치를 권해요. 탭 바처럼 커지지 않는 컨트롤은 Large Content Viewer로 대신해요. Zoom 같은 시스템 기능에 기대어 표시하면 안 돼요. [1차] https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria
- Captions·Audio Descriptions는 영상·오디오가 있는 앱 대상이에요. oat는 해당 없음(추론).

oat 출시 때 표시 판단(추론):

| 항목 | 판단 |
|---|---|
| Dark Interface | 표시 가능. 다크 모드를 이미 지원하기로 함 |
| VoiceOver | 키패드·재정렬·차트 대체 텍스트까지 만들면 가능. **로그인·온보딩·설정까지 전부** 통과해야 해서 출시 전 점검표가 필요 |
| Larger Text | 금액 헤드라인·키패드·목록이 AX3 이상에서 겹치지 않으면 가능 |
| Differentiate Without Color Alone | 수입/지출, 수익/손실을 색 + 부호(+/−)나 글자로 표시하면 가능 |
| Sufficient Contrast, Reduced Motion | 디자인 토큰 대비 점검, 화면 전환·숫자 애니메이션의 Reduce Motion 대응을 하면 가능 |
| Voice Control | 모든 버튼에 보이는 이름과 같은 레이블이 필요. 아이콘만 있는 버튼이 많으면 어려움 |

## 9. H. Dynamic Type과 큰 숫자

### 9.1 Apple 권장

- 큰 크기에서도 **잘림을 최소화**하고, 필요하면 여러 줄을 쓰라고 해요(`numberOfLines`). [1차] https://developer.apple.com/design/human-interface-guidelines/typography
- **큰 크기에서는 레이아웃을 바꾸라**: 가로로 붙은 요소(아이콘, 시간)가 글자를 밀어내면 글자를 위, 보조 요소를 아래로 쌓는 세로 배치를 고려하고, 열 수를 줄이라고 해요. 판별은 `isAccessibilityCategory`. [1차] 같은 URL
- `isAccessibilityCategory`는 accessibilityMedium ~ accessibilityExtraExtraExtraLarge(=AX1~AX5)에서 true예요. [1차] https://developer.apple.com/documentation/uikit/uicontentsizecategory/isaccessibilitycategory
- 모든 텍스트가 똑같이 커지길 원하는 건 아니라고 해요. 사용자가 중요하게 여기는 내용을 우선 키우라고 해요(탭 제목은 안 커져도 된다는 예시). [1차] typography URL
- `adjustsFontSizeToFitWidth`: 넘치면 최소 크기까지 줄이고, **한 줄 라벨에만 쓰라고** 해요. `minimumScaleFactor`를 같이 정하라고 해요(기본 0이면 안 줄어듦). [1차] https://developer.apple.com/documentation/uikit/uilabel/adjustsfontsizetofitwidth, https://developer.apple.com/documentation/uikit/uilabel/minimumscalefactor
- 크기를 키울 수 없는 곳(탭 바 버튼)은 **Large Content Viewer**를 쓰고, Dynamic Type 대체로 쓰지 말라고 해요. [1차] https://developer.apple.com/documentation/uikit/uilargecontentviewerinteraction
- 최대 크기 제한을 권장하는 Apple 문장은 **못 찾았어요.** 오히려 Larger Text 라벨은 200% 이상을 요구해요(8.3).

### 9.2 React Native

- `allowFontScaling` 기본 true. `maxFontSizeMultiplier`: `undefined`면 부모/전역 기본값 상속, `0`은 제한 없음, `>=1`이면 그 배율이 상한. [1차] https://reactnative.dev/docs/text
- `adjustsFontSizeToFit`(기본 false) + `minimumFontScale`(0.01~1.0). [1차] 같은 URL
- `dynamicTypeRamp`(iOS): `largeTitle`, `title1` 같은 Dynamic Type 램프를 지정해 시스템 비율로 커지게 해요. 기본 `body`. [1차] 같은 URL

### 9.3 oat에 대한 판단(추론)

- 금액 헤드라인: 한 줄 고정 + `adjustsFontSizeToFit` + `minimumFontScale` 0.5 안팎. "1,234,567,890원"처럼 긴 금액과 AX5를 같이 시험해요. 헤드라인을 상한 없이 키우면 키패드를 밀어내니 `maxFontSizeMultiplier`로 상한을 두되, 상한이 200% 아래면 Larger Text 라벨과 부딪혀요. 금액 헤드라인은 기본 크기가 이미 커서 "본문 텍스트" 기준과는 따로 판단할 여지가 있어요(평가 기준이 "Body text"를 말함).
- 키패드 키: 키 크기가 화면 폭에 묶여 있어서 글자만 키우면 넘쳐요. 키 숫자에 상한을 두고, 대신 키 자체를 크게 만들어요.
- 목록 줄(가맹점 · 카테고리 · 금액): AX 크기에서는 금액을 아래 줄로 내리는 세로 배치로 바꿔요.

## 10. I. 콜드 스타트 목표

### 10.1 Apple

- WWDC19 "Optimizing App Launch": **"we need to hit the goal of rendering our first frame within 400 milliseconds."** 실행 애니메이션 동안 화면을 그리고, 애니메이션이 끝날 때 앱이 반응해야 한다는 뜻이에요. 첫 프레임은 비동기 데이터 자리표시자가 있어도 되지만 그 시점에 반응해야 한다고 해요. 측정은 Release 빌드, 재개(resume)와 실행을 섞지 말 것, 일관성을 위해 웜 실행으로 재라고 해요. [1차] https://developer.apple.com/videos/play/wwdc2019/423/
- 측정 정의: Xcode Organizer와 MetricKit은 **"time to first frame"**을 실행 시간으로 써요. 아이콘 탭부터 첫 프레임까지이고, 런치 스크린은 포함되며 그걸로 끝나지 않아요. **첫 프레임 뒤에 로딩 스피너를 보여주는 시간은 지표에 안 들어가지만 사용자는 실행 시간으로 느낀다**고 해요. [1차] https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time
- Organizer Launch Time 창: p50·p90을 기기별로 보고, 릴리스끼리 비교해요. Launches 창은 실행 중 오래 걸린 함수 목록을 보여줘요. MetricKit은 `TimeToFirstDrawMetric`, `ApplicationResumeTimeMetric` 히스토그램을 전날 기준으로 줘요. Instruments의 App Launch 템플릿으로 프로파일해요. [1차] 같은 URL
- watchdog: 실행·반응이 느린 앱을 `0x8badf00d`로 강제 종료해요. 문서의 실행 예시 크래시 로그에 **"exhausted real (wall clock) time allowance of 19.97 seconds"**가 있어요. 정확한 한도를 규칙으로 밝힌 문장은 없고, 다른 예시는 15초·5초예요. [1차] https://developer.apple.com/documentation/xcode/addressing-watchdog-terminations

### 10.2 RN/Expo와 공개 수치

| 출처 | 내용 | 근거 |
|---|---|---|
| Expo 가이드(2026-09-29) | 목표: **콜드 1.5초 미만, 웜 0.5초 미만, TTI 3초 미만(콜드 포함)**. Apple은 임계값을 공개하지 않고 WWDC19 400ms 목표만 있다고 정리. Release 빌드로 재라고 함. `markInteractive()`로 TTI 기록(실행당 첫 호출만) | [1차] https://expo.dev/articles/app-performance-and-reliability/app-startup-time |
| Expo 지표 설명 | 번들 로드, TTR(네이티브 실행 끝 → 루트 React 첫 렌더), TTI(실행 → 탭·스크롤 가능) 정의 | [1차] https://expo.dev/guides/react-native-startup-metrics-explained |
| Shopify 앱(2024-03-05) | 목표 **p75 2초 안 실행**, 시작 당시 p75 약 4초 → 44% 개선. Metro `inlineRequires`로 17% 개선 | [1차] https://shopify.engineering/improving-shopify-app-s-performance |
| Shopify Shop 앱(2026-09-10) | 네이티브 재작성 뒤 콜드 스타트 iOS **3200ms(RN) → 2466ms(네이티브)**, 안드로이드 4433 → 2233ms. 아이콘 탭부터 홈 피드가 보일 때까지, 화면 녹화로 측정. Shop 앱은 New Architecture 이전이었다는 보도 있음 | [1차] https://shopify.engineering/shop-app-migration |
| Discord(2026-11-19 보도) | 모바일 재작성 빌드 로드 2초 미만 vs 기존 약 5초(CTO X 게시물 인용) | [2차] https://www.infoq.com/news/2026/11/discord-rust-rewrite-gpui-zed |
| Hermes V1 | 선행 문서 3.5 참고(TTI 약 2.5% 개선) | — |

### 10.3 oat에 대한 판단(추론)

- 지표를 둘로 나눠요. **첫 프레임**(Organizer·MetricKit이 자동으로 재 줌, 목표 400ms대)과 **TTI**(기록 탭에서 키패드를 누를 수 있을 때, `markInteractive` 또는 직접 마커).
- TTI 목표는 Expo 콜드 목표 1.5초를 p75로 잡아요. 금액 키패드는 서버 응답 없이 그릴 수 있으니, 결제수단·카테고리 목록을 기다리지 말고 캐시(persist)에서 그려요.
- Shop 앱 RN iOS 3.2초는 "홈 피드 콘텐츠까지"라서 oat의 "키패드까지"와 비교하면 안 돼요.

## 11. J. 오프라인과 저장 실패

### 11.1 앱 사례

- YNAB: 모바일이 "이동 중 기록"에 좋다고 하지만, **오프라인 입력을 대기열로 보관하는지 공식 문서는 못 찾았어요.** [1차, 해당 문장 없음] https://support.ynab.com/en_us/adding-transactions-without-direct-import-B1kBALVaxx.md
- Copilot: 공식 문서 **미확인**. 경쟁 앱 리뷰가 "오프라인 모드 없음"이라고 하지만 경쟁사 글이라 참고만 해요. [2차] https://pocketclear.app/blog/copilot-money-review-2026.html
- Monarch: **미확인**.

### 11.2 TanStack Query 공식 문서

- `networkMode` 기본 `online`: 연결이 없으면 쿼리·mutation을 실행하지 않고 `paused` 상태로 기다려요. `always`, `offlineFirst`도 있어요. [1차] https://tanstack.com/query/latest/docs/framework/react/guides/network-mode
- 오프라인이라 실패한 mutation은 **재연결 때 같은 순서로 재시도**해요. 같은 `scope.id`의 mutation은 직렬로 실행돼요. [1차] https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- 앱을 다시 열어도 이어가려면: 함수는 직렬화되지 않으므로 **`setMutationDefaults`로 기본 `mutationFn`을 등록**해야 하고, `PersistQueryClientProvider`의 `onSuccess`(복원 완료)에서 **`resumePausedMutations()`**를 불러요. 안 그러면 "No mutationFn found"로 실패할 수 있어요. [1차] 같은 URL
- persist: `createAsyncStoragePersister` 등. `maxAge` 기본 24시간(넘으면 조용히 버림), `gcTime`은 `maxAge` 이상으로, `buster`로 앱 버전이 바뀌면 캐시 무효화. [1차] https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
- RN에서는 `onlineManager`에 NetInfo나 `expo-network` 리스너를 연결하고, `AppState`로 `focusManager`를 연결해야 해요. [1차] https://tanstack.com/query/latest/docs/framework/react/react-native

### 11.3 oat에 대한 판단(추론)

- 기록 저장을 "기록 추가" mutation 하나로 통일하고 `setMutationDefaults`에 등록해요. 낙관적 업데이트로 목록에 바로 넣고 "보내는 중" 표시를 해요.
- 재시도가 서버에 두 번 들어가지 않게 **클라이언트가 만든 기록 id(UUID)**로 저장하고, 서버는 같은 id면 무시해요(멱등).
- 가구 공용 장부는 상대가 같은 시간에 고칠 수 있어요. 오프라인 대기 중인 "수정"은 충돌 규칙이 필요해서, 1차 출시엔 **오프라인 대기는 새 기록 추가만** 허용하는 게 안전해 보여요.
- `maxAge` 24시간이 지나면 캐시가 조용히 버려지는데, 대기 중 mutation까지 같이 사라지는지 PoC에서 확인해야 해요.
- 저장 실패(서버 거절)와 일시정지(오프라인)를 다르게 보여줘요. 일시정지는 조용한 표시, 거절은 줄에 "다시 시도" 버튼.

## 12. 확인하지 못한 것

- 토스 송금 만/억 힌트·빠른 금액 버튼, 카카오뱅크 +1만/전액 버튼, 뱅크샐러드·네이버페이 가계부·후잉의 수기 입력 화면과 추가 버튼 위치. 기기에서 직접 봐야 해요.
- 편한가계부의 + 버튼 위치, "계속" 뒤에 남는 값, 북마크·자동완성 세부(도움말이 Cloudflare로 막힘).
- Monarch 분할 화면의 남은 금액 표시, Monarch·Money Lover·Delta·Spendee 도움말 원문(403).
- 마지막 결제수단을 기억한다고 공식 문서로 밝힌 가계부 앱.
- 저장 후 되돌리기 토스트를 쓰는 가계부 앱 사례, 단계식(위저드) 입력 가계부 사례.
- 국내 증권사 앱의 초성 종목 검색 지원 여부.
- YNAB·Copilot·Monarch의 오프라인 입력 대기열 지원 여부.
- expo-router NativeTabs의 안정성 단계, 탭 바 높이를 알 수 없을 때 하단 고정 버튼 배치 방법.
- watchdog 실행 한도의 정확한 값(문서는 크래시 로그 예시만 있음).
- TanStack Query persist의 `maxAge`가 지난 뒤 일시정지된 mutation도 같이 버려지는지.
- RN Fabric에서 `adjustsFontSizeToFit`·`minimumFontScale`의 실제 동작(한국어 금액, AX5). PoC에서 확인해야 해요.
