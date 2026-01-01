---
name: db-work
description: DB 스키마, 마이그레이션, Supabase, RLS 정책 관련 작업 시 사용. "테이블 생성", "마이그레이션 추가", "RLS 정책", "스키마 수정", "Supabase" 등의 요청에 활성화됩니다.
---

# Database 작업 가이드

이 작업을 시작하기 전에 반드시 다음 문서를 읽어주세요:

@.claude/docs/DATABASE.md

## 핵심 규칙

### 데이터 구조
- **transactions 기반 구조**: 매수/매도 기록 → holdings View로 현재 보유량 자동 집계
- **household 단위 데이터 격리**: RLS로 가구별 데이터 분리

### Supabase 작업 시
- 마이그레이션 파일은 `supabase/migrations/` 에 생성
- 타입 생성: `supabase gen types typescript --local > types/database.types.ts`
- RLS 정책 필수 적용

### 네이밍 규칙
- 테이블명: snake_case, 복수형 (예: `transactions`, `households`)
- 컬럼명: snake_case (예: `created_at`, `household_id`)
- Enum: snake_case (예: `asset_type`, `market_type`)
