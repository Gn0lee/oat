# CONVENTIONS_FE.md

> 프론트엔드 컨벤션. 공통 사항은 CONVENTIONS.md 참조.

## TL;DR

- **레이어 분리** - 컴포넌트 → 훅 → API 함수 → 데이터소스
- **React Query + Query Key Factory** - 서버 상태 관리
- **Zustand** - 클라이언트 전역 상태만
- **react-hook-form + zod** - 폼 상태 및 검증
- **react-error-boundary** - 선언적 에러 처리
- **shadcn/ui + Tailwind** - UI 컴포넌트
- **SSGOI** - 페이지/화면 단위 전환 기준 (`TRANSITIONS.md` 참고)
- **컬렉션 UI** - 테이블보다 리스트, 캘린더, 타임라인, 선택-상세 구조를 사용자 화면 기본값으로 검토

---

## 1. 데이터 페칭 레이어

### 구조

```
컴포넌트 → React Query 훅 → API 함수 → Supabase/API Route
              ↑                ↑
         캐싱/상태 관리      데이터소스 추상화
```

### 원칙

- **컴포넌트**: UI 렌더링만, 데이터 로직 없음
- **훅**: React Query로 캐싱, 로딩/에러 상태 관리
- **API 함수**: 실제 페칭 로직, 데이터소스 교체 시 여기만 수정

### Query Key Factory

`@lukemorales/query-key-factory` 권장. queryKey와 queryFn을 한 곳에서 관리.

```
lib/queries/index.ts  # 모든 쿼리 정의
```

### staleTime 가이드

| 데이터 | staleTime | 이유 |
|--------|-----------|------|
| 보유 현황 | 5분 | 거래 후 갱신 |
| 거래 내역 | 5분 | 자주 변경 안 됨 |
| 주가 | 30분 | 캐싱 정책 |
| 환율 | 30분 | 캐싱 정책 |

---

## 2. 상태 관리

| 상태 유형 | 도구 | 예시 |
|----------|------|------|
| 서버 데이터 | React Query | 보유 현황, 거래 내역 |
| 클라이언트 전역 | Zustand | UI 상태, 필터 옵션 |
| 폼 상태 | react-hook-form | 입력값, 유효성 |
| 로컬 상태 | useState | 단순 토글 |

### Zustand 원칙

- UI 상태, 사용자 설정 등 클라이언트 전용만
- 서버 데이터를 Zustand에 저장하지 않음

---

## 3. 폼 & 검증

### 구조

- **zod**: 스키마 정의 (`schemas/`)
- **react-hook-form**: 폼 상태 관리
- **@hookform/resolvers**: zod 연동

### 검증 메시지

- 한글로 친절하게: "종목 코드를 입력해주세요"
- 구체적으로: "0보다 큰 값을 입력해주세요"

---

## 4. 에러 핸들링

### react-error-boundary

- 전역, 페이지별, 컴포넌트별로 계층적 적용 권장
- `FallbackComponent`로 에러 UI 분리
- `useErrorBoundary` 훅으로 수동 에러 트리거 가능

### React Query 에러 처리

| 옵션 | 설정 | 이유 |
|------|------|------|
| queries.throwOnError | true | 에러 바운더리로 전파 |
| mutations.throwOnError | false | 직접 핸들링 (토스트 등) |
| 401 에러 | 재시도 안 함 | 인증 만료 |

---

## 5. 라우팅 패턴

페이지 전환, funnel step 전환, 모바일 full-screen selector는 `.claude/docs/TRANSITIONS.md`의 SSGOI 기준을 따릅니다.

### 컬렉션 화면 구현 기준

금융 기록이나 자산을 많이 보여주는 사용자-facing 화면은 테이블이나 카드 그리드를 기본값으로 두지 않습니다. 먼저 데이터 성격에 맞는 컬렉션 UI를 설계하고, 필요한 경우에만 내부 구현 도구로 table primitive나 TanStack Table을 사용합니다.

#384 이후 섹션, grouped list, row, metric, 상태, 금액 표시가 필요한 화면은 먼저 `components/layout/screen/`의 screen primitive를 검토합니다. 세부 기준은 `.claude/docs/SCREEN_PRIMITIVES.md`를 따릅니다.

| 화면 유형 | 기본 구조 |
|----------|----------|
| 날짜 기반 기록 | 캘린더/날짜별 목록/타임라인 + 상세 또는 작업 화면 |
| 보유 항목 | 리스트 + 정렬/필터 control + 필요 시 선택-상세 |
| 설정/관리 항목 | grouped compact list + item action |
| 기간 요약 | metric list/timeline + 현재 기간 강조 |

구현 원칙:
- API 응답은 우선 그대로 사용하고, UI 계층에서 그룹핑/정렬/요약을 구성합니다.
- 서버 API 변경은 데이터 양, 페이지네이션, 월 단위 조회 같은 성능 문제가 확인될 때 후속으로 검토합니다.
- PC도 테이블이나 카드 그리드를 기본값으로 두지 않습니다. 넓은 화면은 컬럼 추가보다 그룹핑, 비교, 선택-상세 영역에 사용합니다.
- 모바일과 PC의 정보 구조는 공유하되, PC는 master-detail 레이아웃을 선택적으로 사용할 수 있습니다.
- 리스트 item에 모든 필드를 나열하지 말고 대표값, 보조 정보, 액션으로 재구성합니다.
- 카드는 요약 지표, 선택 가능한 큰 진입점, 빈 상태, 확인 영역처럼 독립적으로 강조해야 하는 경우에만 사용합니다.
- 정렬/필터는 table header에 숨기지 않고 상단 segmented control, select, filter button 등 명시적 control로 둡니다.

### UI 개선 이슈 분해 기준

앱 전반의 UI 개선은 전수조사 없이 임의 영역으로 나누지 않습니다. 먼저 화면별 현재 구조와 문제 유형을 기록한 뒤, 하위 이슈는 비슷한 수정 방향을 공유하는 화면끼리 묶습니다.

전수조사 항목:

- 사용자-facing route를 1행으로 두고, 주요 컴포넌트는 보조 컬럼에 기록합니다.
- dialog, drawer, composer는 해당 route의 하위 흐름으로 기록합니다.
- 화면 경로와 주요 컴포넌트
- 현재 기본 구조: 카드, 리스트, 테이블, 캘린더, composer, form, dialog/drawer
- 문제 유형: 카드 과다, PC 폭 불일치, 긴 텍스트 overflow, 금액 표기 불일치, 액션 위치 불명확, 모바일 조작 불편
- 권장 수정 방향: 리스트 전환, 섹션 정리, master-detail, 금액 포맷 통일, row overflow 정책, 공통 primitive 추출
- 하위 이슈 후보와 선행/후행 관계

전수조사 태그:

| 태그 | 의미 |
|------|------|
| `layout-width` | PC 폭, max-width, 여백, 2컬럼/1컬럼 문제 |
| `card-overuse` | 섹션/목록을 카드로 감싸 면적을 많이 쓰거나 투박해지는 문제 |
| `collection-pattern` | 테이블/카드/목록/캘린더/선택-상세 중 화면 구조 자체를 바꿔야 하는 문제 |
| `money-text` | `₩`, `원`, 축약 금액, 음수/양수, 긴 금액 표시 문제 |
| `overflow-text` | 긴 제목, 종목명, 계좌명, 메모, 버튼 텍스트 처리 문제 |
| `action-placement` | 추가/편집/삭제/필터/닫기 같은 액션 위치와 affordance 문제 |

하위 이슈 작성 원칙:

- 한 이슈 안의 화면들은 같은 UI 정책과 공통 primitive를 공유해야 합니다.
- 공통 primitive가 필요한 경우, 개별 화면 수정 이슈보다 먼저 분리합니다.
- 금액/긴 텍스트 정책처럼 여러 영역에 영향을 주는 변경은 별도 이슈로 분리합니다.
- 단순 검색 결과가 아니라 실제 화면 역할과 사용자 흐름 기준으로 묶습니다.
- 인증/초대 화면은 전수조사에 포함하되, 로그인 후 메인 앱 개선 이슈와 별도 묶음으로 관리합니다.

### 자산 유형별 계층 구조

자산은 `/assets/[type]/...` 패턴으로 유형별 계층 구조를 따릅니다.

```
app/(main)/
├── home/                          # /home - 홈 (총 자산 요약, 빠른 액션)
├── assets/                        # /assets - 자산 메인 (유형 선택 허브)
│   ├── page.tsx                   # 자산 유형별 진입점
│   ├── total/
│   │   └── holdings/
│   │       └── page.tsx           # /assets/total/holdings - 전체 보유 현황
│   └── stock/                     # 주식 자산
│       ├── analysis/
│       │   ├── page.tsx           # /assets/stock/analysis - 주식 분석 허브
│       │   ├── overview/          # /assets/stock/analysis/overview - 종합 분석
│       │   ├── by-owner/          # /assets/stock/analysis/by-owner
│       │   └── by-risk/           # /assets/stock/analysis/by-risk
│       ├── holdings/
│       │   └── page.tsx           # /assets/stock/holdings - 주식 보유 현황
│       ├── records/
│       │   └── page.tsx           # /assets/stock/records - 주식 일별 기록
│       └── transactions/
│           ├── page.tsx           # /assets/stock/transactions - 주식 거래 내역
│           └── new/
│               ├── daily/page.tsx # /assets/stock/transactions/new/daily?date=YYYY-MM-DD
│               ├── full/page.tsx  # /assets/stock/transactions/new/full
│               └── account/page.tsx # /assets/stock/transactions/new/account
└── settings/                      # /settings - 설정
```

### 확장 패턴

새 자산 유형 추가 시 동일 패턴 적용:

```
assets/
├── stock/        # 주식 (MVP)
├── cash/         # 현금/예적금 (2단계)
├── real-estate/  # 부동산 (2단계)
└── other/        # 기타 (2단계)
```

각 유형별로 동일한 하위 구조:
- `holdings/` - 보유 현황
- `transactions/` - 거래/기록 내역
- `transactions/new/full/` - 맥락 없는 전체 기록 추가
- `transactions/new/account/` - 특정 계좌 맥락의 기록 추가

여러 기록을 한 번에 만드는 입력 화면은 route segment로 입력 모드를 드러냅니다.

```
ledger/
└── records/
    └── new/
        ├── full/                 # /ledger/records/new/full
        └── daily/                # /ledger/records/new/daily?date=YYYY-MM-DD

assets/
└── stock/
    └── transactions/
        └── new/
            ├── full/             # /assets/stock/transactions/new/full
            ├── daily/            # /assets/stock/transactions/new/daily?date=YYYY-MM-DD
            └── account/          # /assets/stock/transactions/new/account?accountId=...
```

기존 짧은 진입 경로는 필요한 동안 redirect로 유지합니다.

### 자산 분석 계층 구조

자산 분석은 독립 `/dashboard` 축이나 전체 자산 분석 허브를 만들지 않고 각 자산 유형 하위에 둡니다. `/assets/analysis` 계열은 제품 표면이 아니며, 현재 주식 분석은 `/assets/stock/analysis` hub 아래에 둡니다.

```
app/(main)/
├── assets/
│   └── stock/
│       └── analysis/
│           ├── page.tsx           # /assets/stock/analysis - 주식 분석 허브
│           ├── overview/
│           │   └── page.tsx       # /assets/stock/analysis/overview
│           ├── by-owner/
│           │   └── page.tsx       # /assets/stock/analysis/by-owner
│           └── by-risk/
│               └── page.tsx       # /assets/stock/analysis/by-risk
```

준비 중인 자산 유형 분석은 `/assets/cash/analysis`, `/assets/real-estate/analysis`, `/assets/other/analysis`처럼 각 자산 유형 아래에 둡니다.

---

## 6. 페이지 레이아웃 컴포넌트

### ServiceHeader

서비스 헤더는 개별 페이지가 직접 선언하지 않고, layout에서 현재 route를 기준으로 렌더링합니다. 헤더 정보의 출처는 `constants/service-routes.ts`의 route metadata tree 하나로 모읍니다.

`constants/nav-items.ts`는 bottom/sidebar 1차 메뉴와 active 상태 계산만 담당합니다. 화면 label, parent, closeHref, breadcrumb 같은 서비스 헤더 정보는 `constants/service-routes.ts`로 분리합니다.

```typescript
const SERVICE_ROUTE_TREE = {
  home: {
    href: "/home",
    label: "홈",
    mobile: "topLevel",
  },
  ledger: {
    href: "/ledger",
    label: "가계부",
    mobile: "topLevel",
    children: {
      recordsNewFull: {
        href: "/ledger/records/new/full",
        label: "내역 추가",
        mobile: "task",
        closeHref: "/ledger/records",
      },
    },
  },
  assets: {
    href: "/assets",
    label: "자산",
    mobile: "topLevel",
    children: {
      stock: {
        href: "/assets/stock",
        label: "주식",
        children: {
          holdings: { href: "/assets/stock/holdings", label: "보유 종목" },
          transactions: {
            href: "/assets/stock/transactions",
            label: "거래 내역",
          },
        },
      },
    },
  },
};
```

ServiceHeader는 pathname으로 다음 정보를 계산합니다.

| 값 | 설명 |
|----|------|
| label | 현재 화면의 표시명 |
| mobileVariant | `topLevel`, `child`, `task` |
| parentHref | child 화면의 뒤로가기 목적지 |
| closeHref | task 화면의 Close Action 목적지 |
| breadcrumb | PC 콘텐츠 top bar에 표시할 경로 |

### 헤더 적용 규칙

| 화면 | 모바일 | PC |
|------|--------|----|
| Top-level (`/home`, `/ledger`, `/assets`, `/settings`) | 로고형 Service Header, 본문 큰 제목 없음 | 사이드바 oat 로고, breadcrumb 생략 또는 최소화 |
| Child | `뒤로가기 + 화면 제목`, 본문 큰 제목 없음 | 콘텐츠 top bar 좌측 breadcrumb |
| Task | `뒤로가기 + 화면 제목 + 선택적 X`, 본문 큰 제목 없음 | 콘텐츠 top bar 좌측 breadcrumb |

- `X`는 back이 아니라 Close Action입니다. 작업 흐름을 닫고 안정적인 상위 목적지로 이동합니다.
- 모바일 ServiceHeader는 `PageTransition` 안에 둡니다. 앱 바가 본문과 함께 drill 전환되어야 하기 때문입니다.
- PC ServiceHeader는 `PageTransition` 바깥의 content top bar에 둡니다. breadcrumb bar는 app chrome으로 유지하고 본문만 전환합니다.
- 페이지 파일에서 `PageHeader`를 추가하지 않습니다. 화면 제목, back, close, breadcrumb는 ServiceHeader가 담당합니다.
- 화면별 action 버튼은 헤더에 억지로 넣지 말고, 해당 콘텐츠 영역의 주요 액션 위치에 둡니다. 단, 모바일 앱 바의 Close Action처럼 탐색 의미가 있는 액션은 ServiceHeader에서 관리합니다.

### PageContainer

페이지 콘텐츠의 최대 너비와 일관된 여백을 중앙 관리하는 컴포넌트입니다. `app/(main)/layout.tsx`는 레이아웃 패딩과 사이드바, 헤더 영역만 소유하며, 실제 콘텐츠의 최대 너비(max-width)는 개별 페이지 내의 `PageContainer`가 결정합니다.

모든 `app/(main)` 페이지는 다음과 같이 `PageContainer`를 적용하거나 래핑하여 명시적인 너비 의도를 드러내야 합니다.

```tsx
import { PageContainer } from "@/components/layout";

// 기본 너비 (default) - max-w-5xl
// 대시보드 홈, 가계부 메인, 자산 목록, 분석, 2컬럼 레이아웃 등 일반 화면
<PageContainer maxWidth="default">
  {children}
</PageContainer>

// 중간 너비 (medium) - max-w-3xl
// 설정 subpage, 계좌/결제수단/카테고리 관리 및 상세 화면, 알림 상세 등
<PageContainer maxWidth="medium">
  <HouseholdSettings />
</PageContainer>

// 좁은 너비 (narrow) - max-w-xl
// 수입/지출/거래 추가 등 작업(Task) 및 입력 폼 화면
<PageContainer maxWidth="narrow">
  <SettingsMenu />
</PageContainer>
```

| Props | 타입 | 기본값 | 설명 |
|-------|------|--------|------|
| maxWidth | "default" \| "narrow" \| "medium" | "default" | 컨테이너 너비 (`default` = `max-w-5xl`, `medium` = `max-w-3xl`, `narrow` = `max-w-xl`) |
| className | string | - | 추가적인 스타일 클래스 |

#### PC 2-column 레이아웃 정책
- 좌/우 2개의 명확한 콘텐츠 흐름이 존재하는 화면(예: 달력/요약 + 선택 날짜 목록 등)에만 2-column 그리드 레이아웃을 사용하며, 너비는 `default`를 적용합니다.
- 단순히 넓은 화면을 채우기 위해 인위적으로 2컬럼 레이아웃을 구성해서는 안 됩니다. 단일 콘텐츠 흐름을 갖는 상세/관리 화면은 `medium`, 작업 폼은 `narrow`를 사용하여 중앙 정렬로 시각적 밀도를 유지합니다.

### 페이지별 적용 가이드

| 페이지 구분 | 대상 예시 경로 | ServiceHeader | PageContainer |
|-------------|----------------|---------------|---------------|
| **Top-level / Hub** | `/home`, `/ledger`, `/assets`, `/assets/stock` | topLevel | default (`max-w-5xl`) |
| **Analysis** | `/ledger/analysis/**`, `/assets/stock/analysis/**` | child | default (`max-w-5xl`) |
| **Records Calendar** | `/ledger/records`, `/assets/stock/records` | child | default (`max-w-5xl`) |
| **Management / Settings** | `/settings`, `/settings/household`, `/settings/notifications`, `/settings/mcp`, `/ledger/categories`, `/ledger/payment-methods`, `/assets/accounts`, `/assets/stock/settings` | topLevel / child | medium (`max-w-3xl`) |
| **Simple Detail** | `/ledger/records/[entryId]`, `/assets/stock/transactions/[transactionId]`, `/assets/accounts/[accountId]`, `/ledger/payment-methods/[paymentMethodId]` | child | medium (`max-w-3xl`) |
| **Task / Form** | `/ledger/records/new/*`, `/assets/stock/transactions/new/*`, `/assets/accounts/new`, `/ledger/payment-methods/new` | task | narrow (`max-w-xl`) |

---

## 7. 컴포넌트 구조

### 파일 구조

```typescript
// 1. imports
// 2. types (컴포넌트 전용)
// 3. component
// 4. export
```

### 컴포넌트 분류

| 위치 | 용도 |
|------|------|
| `components/ui/` | 공통 UI (shadcn/ui) |
| `components/layout/` | 레이아웃 컴포넌트 (ServiceHeader, PageContainer 등) |
| `components/[feature]/` | 기능별 컴포넌트 |
| `components/assets/common/` | 자산 공통 (유형 카드 등) |
| `components/assets/stock/` | 주식 전용 컴포넌트 |

### Props 네이밍

```typescript
interface HoldingCardProps {
  holding: Holding;
  onEdit?: (id: string) => void;
}
```

---

## 8. 스타일링

### Tailwind CSS

- shadcn/ui 컴포넌트 기반
- 인라인 className 사용
- 복잡한 스타일은 컴포넌트로 분리

### 반응형

| 브레이크포인트 | 크기 | 용도 |
|---------------|------|------|
| sm | 640px | 모바일 |
| md | 768px | 태블릿 |
| lg | 1024px | 데스크톱 |

---

## 9. 테스트

### 핵심 원칙

테스트는 사용자가 앱을 사용하는 방식으로 작성합니다.
구현 세부사항(CSS 클래스, 내부 state)이 아닌, 사용자에게 보이고 작동하는 것을 검증합니다.
이 원칙을 지키면 리팩토링 시 테스트가 깨지지 않고, 코드가 실제로 동작하는지 신뢰를 줍니다.

### 예시

```typescript
// 나쁜 예 — Tailwind 클래스 이름이 바뀌면 깨지지만 사용자에게는 차이 없음
const grid = container.querySelector('.grid-cols-4')
expect(grid).toBeInTheDocument()

// 좋은 예 — 클래스가 바뀌어도 사용자 경험은 동일하게 검증됨
expect(screen.getAllByRole('link')).toHaveLength(4)

// 나쁜 예 — active 상태를 CSS 클래스로 검증
expect(link.className).toContain('bg-primary/10')

// 좋은 예 — 사용자/스크린리더가 인식하는 방식으로 검증
expect(screen.getByRole('link', { name: '홈' }))
  .toHaveAttribute('aria-current', 'page')
```

### 범위

| 대상 | 도구 |
|------|------|
| 유틸 함수, API 함수, 커스텀 훅 | Vitest |
| UI 컴포넌트 인터랙션 | React Testing Library |
| 핵심 사용자 플로우 | Playwright (3단계) |

DB 마이그레이션, RLS 정책, 외부 API 실제 호출은 테스트하지 않습니다.

### 파일 위치

```
components/
├── holding-card.tsx
└── holding-card.test.tsx  # 같은 폴더
```

---

> 코드 예시: **EXAMPLES.md** 참조
