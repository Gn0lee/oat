# oat

가족 자산 통합 관리 서비스

## 개요

**oat**는 가족이 각자 운용 중인 투자 자산을 통합하여 "우리 집 전체 자산 현황"을 실시간으로 파악하고, 데이터 기반의 자산 배분 의사결정을 돕는 웹 서비스입니다.

## 핵심 기능

- **One View**: 가족 구성원의 자산을 하나의 대시보드에서 통합 조회
- **Auto Valuation**: 주가/환율 자동 반영 (일 1회 갱신)
- **Rebalancing Guide**: 목표 비중 대비 현재 상태 분석

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Linter/Formatter | Biome |
| Database | Supabase (PostgreSQL) |
| State | Zustand + TanStack Query |
| Infra | Vercel |

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm 9+

### 설치

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 실제 값 입력
```

### 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | Biome 린트 실행 |
| `pnpm format` | Biome 포맷 실행 |
| `pnpm check` | Biome 린트 + 포맷 (자동 수정) |
| `pnpm type-check` | TypeScript 타입 검사 |

## 문서

자세한 내용은 [docs/](docs/) 폴더를 참고하세요.

- [PRD.md](docs/PRD.md) - 기능 요구사항
- [DATABASE.md](docs/DATABASE.md) - DB 스키마
- [CONVENTIONS.md](docs/CONVENTIONS.md) - 코드 컨벤션

## 라이선스

Private
