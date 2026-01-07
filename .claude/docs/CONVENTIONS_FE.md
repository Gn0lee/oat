# CONVENTIONS_FE.md

> 프론트엔드 컨벤션. 공통 사항은 CONVENTIONS.md 참조.

## TL;DR

- **레이어 분리** - 컴포넌트 → 훅 → API 함수 → 데이터소스
- **React Query + Query Key Factory** - 서버 상태 관리
- **Zustand** - 클라이언트 전역 상태만
- **react-hook-form + zod** - 폼 상태 및 검증
- **react-error-boundary** - 선언적 에러 처리
- **shadcn/ui + Tailwind** - UI 컴포넌트

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

### 자산 유형별 계층 구조

자산은 `/assets/[type]/...` 패턴으로 유형별 계층 구조를 따릅니다.

```
app/(main)/
├── home/                          # /home - 홈 (총 자산 요약, 빠른 액션)
├── dashboard/                     # /dashboard - 분석 (비중 차트, 수익률)
├── assets/                        # /assets - 자산 메인 (유형 선택 허브)
│   ├── page.tsx                   # 자산 유형별 카드
│   ├── total/
│   │   └── holdings/
│   │       └── page.tsx           # /assets/total/holdings - 전체 보유 현황
│   └── stock/                     # 주식 자산
│       ├── holdings/
│       │   └── page.tsx           # /assets/stock/holdings - 주식 보유 현황
│       └── transactions/
│           ├── page.tsx           # /assets/stock/transactions - 주식 거래 내역
│           └── new/
│               └── page.tsx       # /assets/stock/transactions/new - 주식 거래 등록
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
- `transactions/new/` - 기록 추가

---

## 6. 컴포넌트 구조

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

## 7. 스타일링

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

## 8. 테스트

### 우선순위 (점진적)

| 단계 | 대상 | 도구 |
|------|------|------|
| 1단계 (MVP) | 유틸 함수 | Vitest |
| 2단계 | 폼/컴포넌트 | React Testing Library |
| 3단계 | E2E | Playwright |

### 파일 위치

```
components/
├── holding-card.tsx
└── holding-card.test.tsx  # 같은 폴더
```

---

> 코드 예시: **EXAMPLES.md** 참조