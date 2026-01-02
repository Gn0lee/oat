-- 시스템 테이블 리팩토링
-- stock_master에서 market_cap_size, sector 삭제, 종목유형 컬럼 추가

-- ============================================================================
-- 종목유형 카테고리 enum 생성
-- ============================================================================
create type stock_type_category as enum (
  'stock',    -- 주식
  'etf',      -- ETF
  'etn',      -- ETN
  'fund',     -- 펀드/수익증권
  'reit',     -- 리츠
  'warrant',  -- 워런트
  'index'     -- 지수
);

-- ============================================================================
-- stock_master 컬럼 변경
-- ============================================================================

-- 기존 컬럼 삭제
alter table public.stock_master drop column if exists market_cap_size;
alter table public.stock_master drop column if exists sector;

-- 종목유형 컬럼 추가
alter table public.stock_master add column stock_type_code text;                    -- 원본 코드 (KR: 'ST','EF' / US: '2','3')
alter table public.stock_master add column stock_type_name text;                    -- 한글명 ('주권', 'ETF')
alter table public.stock_master add column stock_type_category stock_type_category; -- 통합 카테고리

-- 인덱스 추가 (카테고리별 필터링용)
create index stock_master_stock_type_category_idx on public.stock_master(stock_type_category);
