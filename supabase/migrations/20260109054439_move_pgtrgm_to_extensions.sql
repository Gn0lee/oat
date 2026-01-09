-- pg_trgm 확장을 extensions 스키마로 이동
-- Supabase Security Advisor 경고 해결: public 스키마의 확장을 extensions 스키마로 이동
-- Issue: #43

-- 1. 기존 GIN 인덱스 삭제 (pg_trgm 의존)
drop index if exists public.stock_master_choseong_idx;
drop index if exists public.stock_master_name_idx;
drop index if exists public.stock_master_name_en_idx;

-- 2. public 스키마의 pg_trgm 확장 삭제
drop extension if exists pg_trgm;

-- 3. extensions 스키마에 pg_trgm 확장 생성
create extension if not exists pg_trgm schema extensions;

-- 4. GIN 인덱스 재생성 (extensions 스키마의 연산자 클래스 사용)
create index stock_master_choseong_idx on public.stock_master
  using gin(choseong extensions.gin_trgm_ops);
create index stock_master_name_idx on public.stock_master
  using gin(name extensions.gin_trgm_ops);
create index stock_master_name_en_idx on public.stock_master
  using gin(name_en extensions.gin_trgm_ops);
