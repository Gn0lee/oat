# CONVENTIONS.md

> 공통 컨벤션. FE는 CONVENTIONS_FE.md, BE는 CONVENTIONS_BE.md 참조.

## TL;DR

- **Biome** - 린트/포맷 (ESLint + Prettier 대체)
- **TypeScript 필수** - strict 모드 권장
- **네이밍 규칙** - 파일, 변수, 함수 일관성 유지
- **Import 순서** - 자동 정렬 (Biome)
- **커밋 컨벤션** - Conventional Commits 권장

---

## 1. 코드 스타일

### Biome

ESLint + Prettier 대신 Biome 사용 권장. 빠르고 단일 도구로 통일.

```bash
pnpm biome check . --write  # 린트 + 포맷
pnpm biome ci .             # CI용 (검사만)
```

### 기본 규칙

| 항목 | 규칙 |
|------|------|
| 세미콜론 | 사용 |
| 따옴표 | 작은따옴표 (`'`) |
| 들여쓰기 | 2 spaces |
| 줄 길이 | 100자 이내 |
| trailing comma | ES5 |

상세 설정은 `biome.json` 참조.

---

## 2. 네이밍 규칙

### 파일 네이밍

| 유형 | 네이밍 | 예시 |
|------|--------|------|
| 컴포넌트 | PascalCase.tsx | `HoldingCard.tsx` |
| 훅 | use-kebab-case.ts | `use-holdings.ts` |
| 유틸리티 | kebab-case.ts | `format-currency.ts` |
| 스키마 | kebab-case.ts | `transaction-schema.ts` |
| API Route | route.ts | `app/api/stocks/route.ts` |

### 변수/함수 네이밍

| 유형 | 네이밍 | 예시 |
|------|--------|------|
| 변수 | camelCase | `totalAmount` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 함수 | camelCase | `fetchHoldings` |
| Boolean | is/has/should 접두사 | `isLoading`, `hasError` |
| 이벤트 핸들러 | handle 접두사 | `handleSubmit` |

### 타입 네이밍

| 유형 | 네이밍 | 예시 |
|------|--------|------|
| 인터페이스 | PascalCase | `Transaction` |
| 타입 | PascalCase | `HoldingWithPrice` |
| Props | ComponentNameProps | `HoldingCardProps` |
| Enum | PascalCase | `TransactionType` |

---

## 3. Import 순서

Biome이 자동 정렬하지만, 기본 순서:

```typescript
// 1. React/Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query';

// 3. 내부 모듈 (절대 경로)
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format-currency';

// 4. 타입
import type { Transaction } from '@/types';

// 5. 상대 경로
import { TransactionCard } from './transaction-card';
```

---

## 4. 프로젝트 구조

```
oat/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지
│   ├── (main)/            # 메인 페이지
│   └── api/               # API Routes
├── components/            # React 컴포넌트
│   ├── ui/               # 공통 UI (shadcn/ui)
│   └── [feature]/        # 기능별 컴포넌트
├── lib/                   # 라이브러리/유틸
│   ├── api/              # API 함수
│   ├── queries/          # Query Key Factory
│   ├── supabase/         # Supabase 클라이언트
│   └── utils/            # 유틸리티
├── hooks/                 # 커스텀 훅
├── schemas/               # Zod 스키마
├── stores/                # Zustand 스토어
├── types/                 # TypeScript 타입
└── docs/                  # 문서
```

---

## 5. 커밋 컨벤션

Conventional Commits 권장:

```
<type>: <description>

feat: 새 기능
fix: 버그 수정
docs: 문서 변경
style: 코드 스타일 (포맷팅 등)
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 등
```

예시:
```
feat: 거래 등록 폼 추가
fix: 환율 캐싱 만료 시간 수정
docs: CONVENTIONS.md 분리
```

---

## 6. 브랜치 전략

MVP 단계에서는 단순하게:

```
main          # 배포 브랜치
└── feature/* # 기능 개발
```

필요 시 확장:
```
main
├── develop
└── feature/*
```

---

> FE 상세: **CONVENTIONS_FE.md** | BE 상세: **CONVENTIONS_BE.md**