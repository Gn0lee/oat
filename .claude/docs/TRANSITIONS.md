# TRANSITIONS.md

> 화면 전환 UX와 SSGOI 사용 기준

## TL;DR

- **표준 라이브러리**: `ssgoi`를 페이지/화면 단위 전환의 기준으로 사용
- **보조 라이브러리**: `framer-motion`은 카드, 리스트, 차트 등 컴포넌트 내부 미세 애니메이션에 한정
- **라우팅 유지**: Next.js App Router와 `@use-funnel/browser`를 유지하고, 전환만 `ssgoi`로 얹음
- **모바일 우선**: 선택지가 많거나 입력 맥락이 넓은 UI는 bottom sheet보다 full-screen transition을 우선 검토
- **접근성**: `prefers-reduced-motion` 사용자를 고려해 과한 이동 전환을 줄이거나 비활성화

---

## 1. 역할 구분

### SSGOI

페이지와 화면 단위의 큰 전환을 담당합니다.

사용 대상:
- 주요 페이지 이동
- form/funnel step 전환
- 모바일 full-screen selector
- 목록에서 상세 화면으로 들어가는 drill-down
- 카드나 row가 상세 화면으로 확장되는 hero/zoom 전환

### framer-motion

현재 프로젝트에 이미 포함되어 있으며, 작은 UI 반응에만 사용합니다.

사용 대상:
- 리스트 item 등장
- 차트/숫자 영역의 가벼운 상태 변화
- 버튼, 카드, 탭 내부의 micro interaction

페이지 전환, 화면 stack, full-screen selector의 표준으로 사용하지 않습니다.

### stackflow

현 시점에서는 도입하지 않습니다.

이유:
- Next.js App Router와 별도의 navigation model을 만들 가능성이 큼
- 이미 `@use-funnel/browser`로 step flow를 표현하고 있음
- oat는 라우터를 교체하기보다 기존 라우팅 위에 전환 계층을 얹는 편이 적합

---

## 2. SSGOI 기본 설정 원칙

SSGOI는 route 변경 시 나가는 화면을 clone해서 `position: absolute`로 다시 배치한 뒤, 들어오는 화면과 동시에 애니메이션합니다. 따라서 wrapper CSS 계약이 중요합니다.

전환 wrapper는 다음 조건을 만족해야 합니다.

| 조건 | 이유 |
|------|------|
| `relative` | 나가는 화면 clone의 위치 기준이 필요 |
| `z-0` | stacking context를 만들어 배경 뒤로 사라지는 문제 방지 |
| `overflow-x-clip` | slide/drill 전환 중 가로 overflow 깜박임 방지 |
| 명확한 scroll element | scroll 위치 보존과 transition 위치 계산의 기준 |

현재 `app/(main)/layout.tsx`는 내부 scroll container를 사용합니다. `Ssgoi`를 실제로 도입할 때는 이 scroll container와 `{children}` wrapper의 관계를 먼저 정리해야 합니다.

권장 형태:

```tsx
<div className="size-full overflow-y-auto overflow-x-clip relative z-0">
  <PageTransitionProvider>
    <PageTransition className="p-4">{children}</PageTransition>
  </PageTransitionProvider>
</div>
```

실제 코드는 현재 레이아웃의 `Header`, `Sidebar`, `BottomNav` 고정 영역과 충돌하지 않도록 조정합니다. padding, background, width 같은 page layout class는 `PageTransition` boundary에 둡니다. boundary 안쪽에 별도 `main`을 두면 OUT page clone이 absolute로 되살아날 때 padding 좌표를 잃어 레이아웃이 흔들릴 수 있습니다.

---

## 3. 페이지 래핑 원칙

기본 페이지 전환은 개별 page 파일에서 직접 감싸지 않습니다. `app/(main)/layout.tsx`의 내부 content 영역에서 `PageTransitionProvider`와 `PageTransition`을 한 번만 적용합니다.

```tsx
<PageTransitionProvider>
  <PageTransition>{children}</PageTransition>
</PageTransitionProvider>
```

`PageTransition`은 `usePathname()`으로 현재 route path를 읽어 `data-ssgoi-transition` 값으로 사용합니다. route 변경 시 같은 DOM 노드의 속성만 바꾸지 않고, `key={pathname}`으로 transition boundary DOM을 새로 만들어야 합니다. 동적 route는 config의 path pattern과 매칭될 수 있도록 일관된 id 정책을 둡니다.

예:
- `/ledger`
- `/ledger/new`
- `/ledger/records`
- `/assets/stock/holdings`
- `/assets/stock/holdings/[ticker]`

---

## 4. 전환 패턴 선택 기준

### `fade`

관계가 약한 페이지 전환의 기본값입니다.

사용:
- 설정 하위 페이지
- 데이터 로딩이 중심인 화면
- 정보 구조상 방향성이 약한 화면

### `drill`

계층형 navigation에 사용합니다.

사용:
- 목록 -> 상세
- 자산 유형 -> 자산 상세
- 테이블 row -> 상세 분석

### `slide` 또는 `axis`

동일한 depth의 sibling 화면 전환에 사용합니다.

사용:
- 탭처럼 나란한 화면
- 분석 유형 간 이동
- funnel step이 순차적일 때

### `sheet`

새 화면이 아래에서 올라와 modal-like하게 열릴 때 사용합니다.

사용:
- FAB -> 기록 작성
- 짧은 작성 화면
- 현재 맥락 위에 임시 작업 화면을 쌓는 경우

bottom sheet 컴포넌트를 무조건 대체하는 것이 아니라, 화면 전체를 쓰는 편이 더 나은 경우에 사용합니다.

### `hero` 또는 `zoom`

같은 논리 객체가 목록에서 상세로 확장될 때 사용합니다.

사용:
- 카드 -> 상세
- 종목 row -> 종목 상세
- 카테고리 카드 -> 카테고리 분석

필수:
- `hero`는 list/detail 양쪽에 matching key가 필요
- `zoom`도 outgoing/incoming key가 필요
- key 값은 데이터 id 기반으로 안정적으로 만든다

---

## 5. Bottom Sheet 대체 기준

모바일에서 다음 조건이면 bottom sheet보다 full-screen transition을 우선합니다.

- 선택지가 많아 검색, 필터, 그룹핑이 필요한 경우
- 키보드가 올라올 가능성이 높은 경우
- 선택 중에 설명, 잔액, 최근 사용 정보 등 부가 정보가 필요한 경우
- 선택 후 다시 form으로 돌아왔을 때 이전 입력 상태가 유지되어야 하는 경우
- sheet 높이 제한 때문에 내용이 답답해지는 경우

bottom sheet를 유지해도 되는 경우:
- 선택지가 3-5개 정도로 적음
- 확인/삭제 같은 짧은 보조 액션
- 현재 화면을 떠나는 느낌을 주면 안 되는 가벼운 작업

---

## 6. Form/Funnel 적용 기준

`@use-funnel/browser`는 step 상태를 담당하고, `ssgoi`는 step 사이 화면 전환을 담당합니다.

적용 대상:
- `components/ledger/funnel/*`
- `components/transactions/funnel/*`
- 계좌/결제수단 생성 flow
- 카테고리/결제수단/종목 선택 화면

권장 UX:
- 각 step은 하나의 full-screen panel처럼 구성
- 뒤로가기는 이전 step으로 돌아감
- 모바일에서는 step header와 back affordance를 명확히 표시
- PC에서는 필요하면 Dialog/Popover를 유지하고 모바일만 full-screen selector로 전환

---

## 7. 구현 체크리스트

SSGOI 도입 PR은 최소한 다음을 포함해야 합니다.

- `@ssgoi/react` 설치
- 전역 transition config 추가
- main layout의 scroll/wrapper CSS 계약 정리
- `prefers-reduced-motion` 정책 추가
- route id 정책 문서화
- 샘플 route 또는 funnel step 1개에만 우선 적용
- 모바일 Safari/PWA에서 화면 밀림, scroll 보존, back 동작 확인

---

## 8. 참고

- SSGOI llms guide: https://ssgoi.dev/llms.txt
- SSGOI docs: https://ssgoi.dev
- SSGOI mobile transitions: https://ssgoi.dev/en/docs/mobile-transitions
- SSGOI transition references: https://ssgoi.dev/llms/.txt
