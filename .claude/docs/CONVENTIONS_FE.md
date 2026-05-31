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
- **컬렉션 UI** - 테이블보다 카드, 리스트, 캘린더, 타임라인, 선택-상세 구조를 사용자 화면 기본값으로 검토

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

금융 기록이나 자산을 많이 보여주는 사용자-facing 화면은 테이블을 기본값으로 두지 않습니다. 먼저 데이터 성격에 맞는 컬렉션 UI를 설계하고, 필요한 경우에만 내부 구현 도구로 table primitive나 TanStack Table을 사용합니다.

| 화면 유형 | 기본 구조 |
|----------|----------|
| 날짜 기반 기록 | 캘린더/날짜별 목록/타임라인 + 상세 또는 작업 화면 |
| 보유 항목 | 리스트/카드 + 정렬/필터 control + 필요 시 선택-상세 |
| 설정/관리 항목 | grouped compact list + item action |
| 기간 요약 | metric list/timeline + 현재 기간 강조 |

구현 원칙:
- API 응답은 우선 그대로 사용하고, UI 계층에서 그룹핑/정렬/요약을 구성합니다.
- 서버 API 변경은 데이터 양, 페이지네이션, 월 단위 조회 같은 성능 문제가 확인될 때 후속으로 검토합니다.
- PC도 테이블을 기본값으로 두지 않습니다. 넓은 화면은 컬럼 추가보다 그룹핑, 비교, 선택-상세 영역에 사용합니다.
- 모바일과 PC의 정보 구조는 공유하되, PC는 master-detail 레이아웃을 선택적으로 사용할 수 있습니다.
- 카드나 리스트 item에 모든 필드를 나열하지 말고 대표값, 보조 정보, 액션으로 재구성합니다.
- 정렬/필터는 table header에 숨기지 않고 상단 segmented control, select, filter button 등 명시적 control로 둡니다.

### 자산 유형별 계층 구조

자산은 `/assets/[type]/...` 패턴으로 유형별 계층 구조를 따릅니다.

```
app/(main)/
├── home/                          # /home - 홈 (총 자산 요약, 빠른 액션)
├── assets/                        # /assets - 자산 메인 (유형 선택 허브)
│   ├── page.tsx                   # 자산 유형별 카드
│   ├── analysis/                  # /assets/analysis - 전체 자산 분석
│   │   ├── page.tsx               # 분석 허브
│   │   ├── by-owner/              # /assets/analysis/by-owner
│   │   ├── by-risk/               # /assets/analysis/by-risk
│   │   └── by-asset-type/         # /assets/analysis/by-asset-type
│   ├── total/
│   │   └── holdings/
│   │       └── page.tsx           # /assets/total/holdings - 전체 보유 현황
│   └── stock/                     # 주식 자산
│       ├── analysis/
│       │   └── page.tsx           # /assets/stock/analysis - 주식 분석
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

자산 분석은 독립 `/dashboard` 축을 만들지 않고 자산 도메인 내부에 둡니다. 전체 자산 분석은 `/assets/analysis`, 특정 자산 유형 분석은 `/assets/[type]/analysis` 패턴을 따릅니다.

```
app/(main)/
├── assets/
│   ├── analysis/
│   │   ├── page.tsx               # /assets/analysis - 전체 자산 분석 허브
│   │   ├── by-owner/
│   │   │   └── page.tsx           # /assets/analysis/by-owner
│   │   ├── by-risk/
│   │   │   └── page.tsx           # /assets/analysis/by-risk
│   │   └── by-asset-type/
│   │       └── page.tsx           # /assets/analysis/by-asset-type
│   └── stock/
│       └── analysis/
│           └── page.tsx           # /assets/stock/analysis
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

페이지 컨테이너 너비를 표준화합니다. 좁은 폼이나 설정 페이지에 사용합니다.

```tsx
import { PageContainer } from "@/components/layout";

// 좁은 너비 (설정, 폼 등) - max-w-lg
<PageContainer maxWidth="narrow">
  <SettingsMenu />
</PageContainer>

// 중간 너비 (가구 관리 등) - max-w-2xl
<PageContainer maxWidth="medium">
  <HouseholdSettings />
</PageContainer>

// 기본 너비 - 레이아웃의 max-w-4xl 사용 (래핑 없음)
// default는 생략 가능하며, Fragment만 반환
<PageContainer maxWidth="default">
  {children}
</PageContainer>
```

| Props | 타입 | 기본값 | 설명 |
|-------|------|--------|------|
| maxWidth | "default" \| "narrow" \| "medium" | "default" | 컨테이너 너비 |

### 페이지별 적용 가이드

| 페이지 | ServiceHeader | PageContainer |
|--------|---------------|---------------|
| `/home` | topLevel | default |
| `/ledger` | topLevel | default |
| `/assets` | topLevel | default |
| `/settings` | topLevel | narrow |
| `/household` | child, parent `/settings` | medium |
| `/assets/stock/holdings` | child, breadcrumb `자산 > 주식 > 보유 종목` | default |
| `/assets/stock/transactions` | child, breadcrumb `자산 > 주식 > 거래 내역` | default |
| `/assets/stock/transactions/new/full` | task, close `/assets/stock/transactions` | narrow |
| `/assets/stock/settings` | child, breadcrumb `자산 > 주식 > 종목 설정` | default |

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
