# CLAUDE.md

> 이 문서는 Claude Code가 프로젝트를 이해하기 위한 진입점입니다.

## TL;DR

- **가족 자산 통합 관리 서비스** - 가족 구성원의 투자 자산을 한 대시보드에서 조회
- **transactions 기반 구조** - 매수/매도 기록 → holdings View로 현재 보유량 자동 집계
- **Supabase + Next.js** - RLS로 가구 단위 데이터 격리, App Router 사용
- **토스 스타일 UI/UX** - 큰 숫자 강조, 충분한 여백, 직관적 흐름

## 문서 구조

모든 Claude 관련 문서는 `.claude/` 디렉토리에 위치합니다.

| 문서 | 경로 | 용도 |
|------|------|------|
| **CLAUDE.md** | `./CLAUDE.md` | 프로젝트 개요 (진입점) |
| **PRD.md** | `.claude/docs/` | 기능 요구사항, 사용자 플로우 |
| **DATABASE.md** | `.claude/docs/` | Supabase 스키마, RLS 정책 |
| **CONVENTIONS.md** | `.claude/docs/` | 공통 컨벤션 |
| **CONVENTIONS_FE.md** | `.claude/docs/` | 프론트엔드 패턴 |
| **CONVENTIONS_BE.md** | `.claude/docs/` | 백엔드/API 패턴 |
| **API.md** | `.claude/docs/` | API 설계 원칙 |
| **DESIGN.md** | `.claude/docs/` | UI/UX 원칙 |
| **EXAMPLES.md** | `.claude/docs/` | 코드 예시 모음 |
| **ENV.md** | `.claude/docs/` | 환경변수 설정 가이드 |

### Skills (작업별 자동 활성화)

| Skill | 활성화 조건 | 참조 문서 |
|-------|------------|----------|
| **db-work** | DB, 마이그레이션, Supabase 작업 | DATABASE.md |
| **ui-work** | UI, 컴포넌트, 스타일링 작업 | DESIGN.md, CONVENTIONS_FE.md |
| **api-work** | API, 백엔드 작업 | API.md, CONVENTIONS_BE.md |
| **feature-work** | 기능 구현 작업 | PRD.md, CONVENTIONS.md |

### Commands

| Command | 설명 |
|---------|------|
| `/next-task` | GitHub 이슈 조회 → 추천 → 브랜치 생성 → 작업 시작 |

## Project Overview

**oat**는 가족이 각자 운용 중인 투자 자산을 통합하여 "우리 집 전체 자산 현황"을 실시간으로 파악하고, 데이터 기반의 자산 배분 의사결정을 돕는 웹 서비스입니다.

### 서비스명: oat

'오트밀'처럼 건강하고 매일 챙겨 먹는(확인하는) 습관을 연상시키며, 발음이 가볍고 기억하기 쉽습니다.

### 핵심 가치
- **One View**: 가족 구성원의 자산을 하나의 대시보드에서 통합 조회
- **Auto Valuation**: 주가/환율 자동 반영 (일 1회 갱신)
- **Rebalancing Guide**: 목표 비중 대비 현재 상태 분석

## Tech Stack

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| Framework | Next.js 14+ (App Router) | SSR/SSG 지원, 빠른 초기 로딩 |
| Language | TypeScript | 타입 안정성, 개발 생산성 |
| State | Zustand | 간결한 전역 상태 관리 |
| Server State | TanStack Query + Query Key Factory | 서버 데이터 캐싱, 동기화 |
| Table | TanStack Table | 자산 목록 정렬/필터링/페이지네이션 |
| Form | react-hook-form + zod | 폼 상태관리, 스키마 검증 |
| Error Handling | react-error-boundary | 선언적 에러 처리 |
| Database | Supabase (PostgreSQL) | Auth, Realtime, Storage 통합 |
| Auth | Supabase Auth | 이메일/비밀번호 (OTP, 2FA는 2단계) |
| Testing | Vitest + RTL + Playwright | 단위/컴포넌트/E2E 테스트 |
| Styling | Tailwind CSS + shadcn/ui | 빠른 UI 개발, 접근성 좋은 컴포넌트 |
| Linter/Formatter | Biome | ESLint + Prettier 대체, 빠른 속도 |
| Infra | Vercel | Next.js 최적화 배포 |
| Stock Data | KIS 마스터파일 + Supabase | 로컬 DB 기반 종목 검색/종가 |
| Exchange Rate | ExchangeRate-API + Supabase | 일 1회 동기화, DB 저장 |
| Data Sync | GitHub Actions | 매일 08:00 KST 자동 동기화 |
| PWA | next-pwa | 모바일 앱 경험 제공 |

## Project Structure

```
oat/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지 (로그인, 회원가입)
│   ├── (main)/            # 인증 후 메인 페이지들
│   │   ├── dashboard/     # 대시보드
│   │   ├── holdings/      # 보유 현황
│   │   ├── transactions/  # 거래 내역
│   │   ├── settings/      # 설정 (종목 설정 포함)
│   │   └── layout.tsx
│   ├── api/               # API Routes
│   │   └── dashboard/     # 대시보드 집계
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                # 공통 UI 컴포넌트
│   ├── dashboard/         # 대시보드 전용 컴포넌트
│   ├── holdings/          # 보유 현황 전용 컴포넌트
│   ├── transactions/      # 거래 관련 컴포넌트
│   └── charts/            # 차트 컴포넌트
├── lib/
│   ├── supabase/          # Supabase 클라이언트 설정
│   ├── api/               # API 함수 (데이터 페칭)
│   ├── queries/           # Query Key Factory
│   └── utils/             # 유틸리티 함수
├── stores/                # Zustand 스토어
├── hooks/                 # 커스텀 훅 (React Query 포함)
├── types/                 # TypeScript 타입 정의
├── constants/             # 상수 정의
└── .claude/               # Claude Code 설정
    ├── docs/              # 참고 문서
    ├── skills/            # 작업별 자동 활성화 가이드
    └── commands/          # 명시적 호출 커맨드
```

## Key Features & Status

### MVP (1단계)

| 기능 | 상태 | 설명 |
|------|------|------|
| 회원가입/로그인 | ⬜ TODO | Supabase Auth, 이메일 + OTP |
| 부부 연결 | ⬜ TODO | 초대 코드 생성 및 수락 |
| 거래 등록 | ⬜ TODO | 매수/매도 기록, 종목 검색 |
| 보유 현황 | ⬜ TODO | holdings View 기반 조회 |
| 종목 설정 | ⬜ TODO | 자산유형, 위험도 관리 |
| 종목 데이터 | ⬜ TODO | KIS 마스터파일 기반 로컬 DB |
| 환율 조회 | ⬜ TODO | ExchangeRate-API, DB 저장 |
| 대시보드 | ⬜ TODO | 총자산, 수익률, 비중 차트 |
| PWA 지원 | ⬜ TODO | 설치 가능한 웹앱 |

### 확장 (2단계)
- 가계부 통합 (수입/지출 관리)
- 부동산/실물 자산 연동
- 목표 관리 및 달성률 추적

## Development Commands

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 타입 체크
pnpm type-check

# 린트 + 포맷
pnpm biome check . --write

# 린트만
pnpm biome lint .

# 빌드
pnpm build

# Supabase 로컬 실행
pnpm supabase:start

# Supabase 타입 생성
pnpm supabase:types
```

## Conventions

### 파일 네이밍
- 컴포넌트: `PascalCase.tsx` (예: `AssetCard.tsx`)
- 훅: `use-kebab-case.ts` (예: `use-assets.ts`)
- 유틸리티: `kebab-case.ts` (예: `format-currency.ts`)
- 타입: `kebab-case.ts` (예: `asset-types.ts`)

### 컴포넌트 구조
```tsx
// 1. imports
// 2. types (컴포넌트 전용 타입은 같은 파일에)
// 3. component
// 4. export
```

### 상태 관리 원칙
- **서버 데이터**: React Query 사용 (자산 목록, 주가 등)
- **클라이언트 전역 상태**: Zustand 사용 (UI 상태, 필터 등)
- **폼 상태**: react-hook-form + zod (입력 검증)
- **로컬 상태**: useState 사용 (단순 UI 토글 등)

### 테스트 원칙
- **단위 테스트**: 유틸 함수, 비즈니스 로직 (Vitest)
- **컴포넌트 테스트**: 주요 UI 컴포넌트 (React Testing Library)
- **E2E 테스트**: 핵심 사용자 플로우 (Playwright)

### 네이밍 규칙
- Boolean 변수: `is`, `has`, `should` 접두사
- 이벤트 핸들러: `handle` 접두사 (예: `handleSubmit`)
- API 함수: `fetch`, `create`, `update`, `delete` 접두사

## Important Context

### 비즈니스 로직

#### 데이터 구조
- **transactions**: 매수/매도 거래 기록 저장
- **holdings (View)**: transactions 기반으로 현재 보유 현황 자동 집계
- **household_stock_settings**: 가구별 종목 설정 (자산유형, 위험도)
- **stock_master**: 종목 마스터 (KIS 마스터파일 기반, 일 1회 동기화)
- **exchange_rates**: 환율 정보 (일 1회 동기화)

#### 거래 등록 플로우
1. 종목 검색 (stock_master 테이블, 로컬 DB)
2. household_stock_settings에 종목 없으면 자동 생성
3. transactions에 거래 기록 INSERT (유저가 입력한 매수가 사용)
4. holdings View에서 자동으로 최신 보유 현황 반영

#### 수익률 계산 (단순 수익률)
```typescript
// 개별 자산 수익률
const returnRate = ((currentPrice - avgPrice) / avgPrice) * 100;

// 전체 포트폴리오 수익률
const totalReturn = ((totalCurrentValue - totalInvestedAmount) / totalInvestedAmount) * 100;
```

#### 환율 처리
- USD 자산은 원화 환산 시 `exchange_rates` 테이블의 환율 적용
- GitHub Actions에서 일 1회 ExchangeRate-API 호출 → DB 저장
- Vercel 서버리스 환경에서 메모리 캐싱 불안정하므로 DB 저장 방식 채택

#### 부부 연결 플로우
1. 사용자 A가 "파트너 초대" 버튼 클릭
2. 6자리 초대 코드 생성 (24시간 유효)
3. 사용자 B가 코드 입력하여 연결 수락
4. 양측 계정이 같은 `household_id`로 그룹화

#### 자산 분류 체계
```
자산군 (Asset Class)
├── 주식 (Equity)
│   ├── 국내 (KR)
│   └── 해외 (US, etc.)
├── 채권 (Bond)
├── 현금성 (Cash)
└── 대체투자 (Alternative)
```

### 데이터 갱신 정책 (GitHub Actions)
- **종목 마스터 (stock_master)**: 일 1회 (매일 08:00 KST)
  - KIS 마스터파일 다운로드 → 파싱 → Supabase UPSERT
  - 국내: KOSPI, KOSDAQ (kospi_code.mst, kosdaq_code.mst)
  - 해외: NYSE, NASDAQ, AMEX (nasmst.cod, nysmst.cod, amsmst.cod)
- **환율 (exchange_rates)**: 일 1회 (매일 08:00 KST)
  - ExchangeRate-API 호출 → Supabase UPSERT
- **사용자 입력**: 실시간 반영

### 보안 고려사항
- 금융 정보는 민감 데이터로 취급
- Supabase RLS(Row Level Security) 필수 적용
- 본인 및 연결된 파트너의 데이터만 조회 가능

## Related Documents

- `.claude/docs/PRD.md` - 기능 요구사항, 사용자 플로우
- `.claude/docs/DATABASE.md` - Supabase 스키마, RLS 정책
- `.claude/docs/ENV.md` - 환경변수 설정 가이드
- `.claude/docs/CONVENTIONS.md` - 공통 컨벤션
- `.claude/docs/CONVENTIONS_FE.md` - 프론트엔드 패턴
- `.claude/docs/CONVENTIONS_BE.md` - 백엔드/API 패턴
- `.claude/docs/API.md` - API 설계 원칙
- `.claude/docs/DESIGN.md` - UI/UX 원칙
- `.claude/docs/EXAMPLES.md` - 코드 예시 모음