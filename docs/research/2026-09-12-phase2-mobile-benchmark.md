# Phase 2 모바일 경험 벤치마킹

- 조사일: 2026-09-12
- 대상: iPhone에서 홈 화면에 설치한 oat PWA
- 사용자 제보: 가계부·주식 입력 중 포커스가 튀고, 화면의 시선 흐름이 어렵고, 하단 버튼이 가려지는 경우가 있다. 가계부 내역 검색 요구도 있다.
- 범위: 공개된 1차 자료와 oat 코드 비교. 토스·현대카드의 로그인 후 개인화 화면을 직접 조작하거나 iOS 실기기에서 oat를 재현하지 않았다.

## 결론

Phase 2의 모바일 개선은 다음 순서가 근거와 현재 코드에 가장 잘 맞는다.

1. **입력 화면의 safe area와 키보드 가림을 먼저 고정한다.** `viewport-fit: cover`를 쓰는 모든 전체 화면·드로어·고정 액션에서 홈 인디케이터와 소프트 키보드를 포함한 실기기 검증 조건을 하나로 정의한다.
2. **가계부·주식 입력의 포커스 이동을 같은 재현표로 진단한다.** 두 흐름이 거의 같은 전체 화면 Drawer 구조를 공유한다. Drawer 열기/닫기, picker 왕복, 항목 전환, 키보드 열기/닫기를 각각 기록해 실제 원인이 확인된 한 지점만 고친다.
3. **조회 화면의 위계를 금액 요약 → 기간/장부 → 내역으로 단순화한다.** 캘린더의 작은 보조 금액은 확대보다 정보량 축소를 먼저 비교한다.
4. **내역 검색을 독립 진입점으로 제공한다.** 현재 월·일·공개 범위·태그 필터와 다른 과업이므로, 검색어와 검색 범위를 URL에 남겨 뒤로가기 후 같은 결과로 복귀하게 한다.
5. **스와이프는 월 이동·장부 전환의 보조 수단으로만 검토한다.** 기존 이전/다음 버튼과 명시적 선택기는 유지한다.

이 순서는 특정 경쟁 앱의 외형을 복제하지 않는다. 공개 자료에서 확인되는 정보 구조와 iOS 웹의 제약을 oat의 실제 문제에 연결한다.

## 확인된 외부 근거

### iOS 웹과 접근성

- WebKit은 `viewport-fit=cover`를 쓰면 콘텐츠가 화면 전체로 확장되므로, 중요한 콘텐츠와 하단 내비게이션에 `env(safe-area-inset-*)`를 적용해야 한다고 설명한다. 기본 여백과 inset 중 큰 값을 쓰는 `max()` 패턴도 제시한다. 문서는 2017-09-22 게시되었고 2017-10-31 갱신되었다. [WebKit, Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- Apple은 safe area를 하드웨어 요소나 상태·탭 바 등에 가리지 않는 영역으로 정의하며, 콘텐츠와 조작 요소가 가려지지 않도록 이를 지키라고 안내한다. [Apple Human Interface Guidelines, Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- WebKit 버그 트래커에는 iOS Safari/WKWebView에서 키보드가 열린 동안 하단 safe-area 크기의 추가 스크롤 영역이 생긴다는 재현 보고가 2025-05-06 등록되어 있다. 이는 oat 증상의 원인으로 확정할 근거는 아니지만, `100vh`/`100dvh`만으로 키보드 상태를 해결했다고 간주하면 안 된다는 실기기 검증 근거다. [WebKit bug 292603](https://bugs.webkit.org/show_bug.cgi?id=292603)
- Apple은 조작 대상을 최소 44×44pt로 만들 것을 권장한다. W3C WCAG 2.2 AA의 최소 기준은 24×24 CSS px 또는 충분한 간격이고, 44×44 CSS px는 강화 기준이다. 단위가 다르므로 두 수치를 같은 것으로 해석하지 않는다. [Apple UI Design Dos and Don'ts](https://developer.apple.com/design/tips/), [W3C WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [W3C Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
- W3C는 스와이프처럼 이동 경로에 의존하는 제스처 기능에 단일 포인터 대체 조작을 요구한다. 따라서 월 이동 스와이프를 넣더라도 이전/다음 버튼이나 월 선택기를 제거하면 안 된다. [W3C WCAG 2.1 Pointer Gestures](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures.html)

### 토스에서 공개적으로 확인되는 것

- 2026-09-12에 확인한 토스 App Store 설명은 계좌 정보를 한곳에서 관리하고, 수입·소비·카드 실적과 정기 지출을 모아본다고 명시한다. 이는 **요약에서 상세 내역으로 내려가는 정보 구조**의 참고 근거다. 화면별 여백, 전환, 검색, 소비 캘린더 토글의 현재 동작까지 증명하지는 않는다. [토스 App Store](https://apps.apple.com/kr/app/%ED%86%A0%EC%8A%A4/id839333328)
- 토스의 SLASH 24 공개 발표 자료에는 `홈`·`소비내역`·`결제 수단` 화면이 분리되어 있고, 소비내역 화면에 거래 목록이 제시된다. 발표 자료는 2024년 시점의 예시이며 현재 개인화 화면과 동일하다고 볼 수 없다. [토스 SLASH 24 발표 자료](https://static.toss.im/slash24/QR/slash24-29.pdf)
- 사용자가 언급한 “소비내역을 캘린더에 포함할지 정하는 토글”은 유용한 관찰 제보이지만, 이번 조사에서 토스의 현재 공식 공개 자료로 검증하지 못했다. Phase 2 요구사항의 근거로 삼으려면 사용자의 최신 화면 캡처나 녹화로 기능명, 위치, 제외 효과를 확인해야 한다.

### 현대카드에서 공개적으로 확인되는 것

- 현대카드는 2022년 공개한 현카연구소 소개에서 소비 캘린더를 사용자가 직접 카테고리와 색상으로 분류하는 기능이라고 설명했다. [현대카드, 디지털 서비스 실험 공간 ‘현카연구소’ 오픈](https://newsroom.hyundaicard.com/front/board/%ED%98%84%EB%8C%80%EC%B9%B4%EB%93%9C-%EB%94%94%EC%A7%80%ED%84%B8-%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%8B%A4%ED%97%98-%EA%B3%B5%EA%B0%84-%ED%98%84%EC%B9%B4%EC%97%B0%EA%B5%AC%EC%86%8C-%EC%98%A4%ED%94%88)
- 2023-03-03 뉴스룸 글은 소비 캘린더를 사용자가 정한 기준으로 소비 내역을 분류해 달력에서 보는 DIY 가계부라고 설명한다. [MZ세대 쏙 빼닮은 앱 만드는 카드사](https://newsroom.hyundaicard.com/front/board/MZ%EC%84%B8%EB%8C%80-%EC%8F%99-%EB%B9%BC%EB%8B%AE%EC%9D%80-%EC%95%B1-%EB%A7%8C%EB%93%9C%EB%8A%94-%EC%B9%B4%EB%93%9C%EC%82%AC)
- 별도 뉴스룸 글은 반복 분류가 불편하다는 사용자 피드백에 따라 미분류 내역을 일괄 선택해 등록하는 기능을 개발 중이라고 밝혔다. oat에는 **반복 입력을 줄이고 여러 건을 한 번에 다루는 방향**이 참고할 만하다. 당시 개발 중이던 기능이며 현재 제공 여부는 이 자료만으로 확정할 수 없다. [카드업계 MAU 1위 ‘현대카드 앱’의 이모저모](https://newsroom.hyundaicard.com/front/board/%EC%B9%B4%EB%93%9C%EC%97%85%EA%B3%84-MAU-1%EC%9C%84-%ED%98%84%EB%8C%80%EC%B9%B4%EB%93%9C-%EC%95%B1%EC%9D%98-%EC%9D%B4%EB%AA%A8%EC%A0%80%EB%AA%A8)
- 2026-09-12에 확인한 현재 App Store 설명은 이번 달 결제 금액과 최근 이용 내역을 한눈에 보여주고 소비케어가 결제 이력과 소비 패턴을 분석한다고 명시한다. 소비 캘린더의 현재 제공 여부와 세부 화면은 설명에서 확인되지 않는다. [현대카드 App Store](https://apps.apple.com/kr/app/%ED%98%84%EB%8C%80%EC%B9%B4%EB%93%9C/id702653088)

## oat 코드에서 확인된 현황

코드 기준점은 `96021d83f8037d96f7eb125bbda2dc20822102a2`다.

### Safe area

- 루트 viewport는 이미 `viewportFit: "cover"`를 사용한다. [`app/layout.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/app/layout.tsx#L19-L24)
- 메인 페이지 콘텐츠와 하단 내비게이션은 `env(safe-area-inset-bottom)`을 반영한다. [`app/(main)/layout.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/app/%28main%29/layout.tsx#L18-L30), [`components/layout/BottomNav.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/layout/BottomNav.tsx#L8-L35)
- 가계부·주식 항목 편집 본문도 하단 padding에 inset을 더한다. 그러나 모바일 Drawer 자체는 `100dvh` 전체 높이를 사용한다. [`LedgerEntryComposer.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/entry-composer/LedgerEntryComposer.tsx#L271-L292), [`ComposerFormStep.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/entry-composer/ComposerFormStep.tsx#L144-L155), [`MultiTransactionForm.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/transactions/MultiTransactionForm.tsx#L184-L206), [`StockComposerFormStep.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/transactions/StockComposerFormStep.tsx#L41-L52)

따라서 “safe area 지원이 전혀 없다”가 아니라 **적용된 경로와 가려지는 실제 경로가 일치하는지 검증되지 않은 상태**다. 버튼이 가려지는 화면을 특정하기 전 전역 padding을 더하면 이미 확보된 여백을 중복시킬 수 있다.

### 입력 포커스

- 가계부와 주식 입력은 모바일에서 같은 패턴을 쓴다: URL의 `editIndex`로 Drawer를 열고, 닫은 뒤 애니메이션 시간 300ms 동안 마지막 항목을 유지하며, 항목 index를 React `key`로 사용한다. [`LedgerEntryComposer.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/entry-composer/LedgerEntryComposer.tsx#L158-L194), [`MultiTransactionForm.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/transactions/MultiTransactionForm.tsx#L49-L75)
- 두 Drawer 모두 기본 자동 포커스를 막는다. 따라서 Drawer 개방 자체가 의도적으로 첫 필드에 focus를 주는 코드는 아니다. [`LedgerEntryComposer.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/entry-composer/LedgerEntryComposer.tsx#L278-L289), [`MultiTransactionForm.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/transactions/MultiTransactionForm.tsx#L191-L203)
- 주식 계좌를 Drawer 안에서 새로 만드는 경로에는 화면 전환 350ms 뒤 DOM id로 `focus()`하는 코드가 있다. 사용자 제보의 원인이라고 단정할 수는 없지만, 키보드와 전환 애니메이션이 겹치는 실기기 점검 대상이다. [`AccountSelector.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/transactions/AccountSelector.tsx#L195-L220)

현재 근거만으로 포커스 문제의 원인을 Drawer, React Hook Form, iOS WebKit 중 하나로 확정할 수 없다. 최소 재현은 가계부와 주식 각각에서 `(항목 열기 → 텍스트 입력 → picker 열기 → 선택 → 복귀 → 다음 필드 → 완료)` 순서를 iOS 버전·기기 모델·키보드 종류와 함께 화면 녹화하고, `document.activeElement` 변화와 `visualViewport` 높이를 임시 계측하는 것이다.

### 시선 흐름과 캘린더

- 가계부 기록 화면은 상단에 입금·지출·잔액 3개 지표, 태그 필터, 월 캘린더, 일별 내역 순으로 배치한다. [`LedgerRecordsClient.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/records/LedgerRecordsClient.tsx#L196-L287)
- 날짜 셀은 수입과 지출을 각각 9px 텍스트로 동시에 표시한다. Apple의 11pt 권고와 CSS px를 직접 등치할 수는 없지만, 작은 칸에 두 금액을 넣어 읽기와 비교가 어려워질 가능성이 큰 프로토타입 대상이다. [`LedgerCalendar.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/records/LedgerCalendar.tsx#L84-L100)
- 월 이동은 좌우 버튼과 연·월 Select로 이미 가능하다. 스와이프를 추가해도 이 대체 조작을 유지할 수 있다. [`LedgerRecordsClient.tsx`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/components/ledger/records/LedgerRecordsClient.tsx#L289-L330)

### 가계부 내역 검색

- 가계부 목록 hook과 GET API는 기간, 날짜, 공개 범위, 태그, 카테고리를 받지만 검색어를 받지 않는다. [`use-ledger-entries.ts`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/hooks/use-ledger-entries.ts#L40-L72), [`app/api/ledger-entries/route.ts`](https://github.com/Gn0lee/oat/blob/96021d83f8037d96f7eb125bbda2dc20822102a2/app/api/ledger-entries/route.ts#L46-L75)
- 제목 자동완성용 API와 MCP의 가계부 검색은 존재하지만, 사용자가 기록 목록에서 검색하는 UI·계약은 아니다. 기존 서버 검색 코드를 재사용할 수 있는지는 검색 범위와 권한 조건을 비교한 뒤 결정해야 한다.

## 채택 후보와 검증 기준

### P0: iPhone PWA 입력 안정성

- 같은 체크리스트를 가계부·주식 입력에 적용한다.
- 기기/OS, 설치 PWA 여부, 한글/숫자 키보드, 화면 경로, 마지막 정상 focus, 튄 focus, 키보드 전후 버튼 가림을 기록한다.
- 전체 화면과 picker 왕복 중 활성 필드가 사용자 입력 없이 바뀌지 않아야 한다.
- 키보드가 열린 상태와 닫힌 상태 모두에서 완료/저장/취소 조작이 보이고 눌려야 한다.
- 수정 후보는 재현 후 한 곳으로 제한한다: Drawer 수명주기, 지연 `focus()`, 스크롤 컨테이너 높이, 또는 하단 액션 여백.

### P1: 가계부 검색

- 화면 상단의 검색 버튼으로 진입하고, 검색어·공개 범위·장부를 URL 상태로 보존한다.
- 첫 범위 후보는 제목과 메모다. 카테고리·태그·금액 검색은 실제 요청이 확인될 때 확장한다.
- 결과 행은 기존 `LedgerEntryRow`와 상세 이동을 재사용한다.
- 검색 결과에서 상세로 갔다가 돌아오면 검색어와 스크롤 위치가 유지되어야 한다.

### P1: 조회 위계 프로토타입

- 비교안 A: 현재 캘린더에서 날짜별 `순지출 1개`만 표시하고 선택한 날짜 아래에서 수입·지출 상세를 보여준다.
- 비교안 B: 캘린더 셀은 상태 점만 표시하고, 월 요약과 선택 날짜 목록에서 정확한 금액을 읽게 한다.
- 성공 기준은 “이번 달 총지출”, “특정 날짜 지출”, “내역 한 건 찾기”를 확대 없이 빠르게 수행하는지다.

### P2: 스와이프

- 월 이동 또는 장부 전환 중 사용자 테스트에서 이득이 확인된 한 곳에만 추가한다.
- 세로 스크롤과 충돌하지 않는 수평 임계값을 실기기에서 검증한다.
- 버튼/Select 대체 조작과 URL 상태는 유지한다.

## 아직 확인해야 할 최소 자료

다음 자료면 최신 개인화 화면과 oat 실기기 문제를 각각 검증할 수 있다.

1. oat에서 가계부 입력 1회와 주식 입력 1회의 화면 녹화. 터치 표시가 있으면 좋고 실제 금액·종목·계좌명은 가려도 된다.
2. 버튼이 가려지는 정확한 화면 1장의 캡처와 기기 모델·iOS 버전.
3. 토스 캘린더 포함 토글의 화면 캡처 또는 짧은 녹화. 토글 전후 캘린더 합계와 전체 소비 합계가 어떻게 달라지는지 확인한다.

이 자료 전에는 경쟁 앱의 최신 세부 동작, oat 포커스 튐의 원인, 특정 버튼의 safe-area 누락을 확정하지 않는다.
