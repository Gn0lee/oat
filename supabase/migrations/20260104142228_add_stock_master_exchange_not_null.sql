-- stock_master.exchange 컬럼을 enum 타입으로 변경하고 NOT NULL 제약 추가
-- 모든 상장 주식은 거래소(exchange)가 반드시 존재함

-- 1. exchange_type enum 생성
create type exchange_type as enum (
  'KOSPI',
  'KOSDAQ',
  'NYSE',
  'NASDAQ',
  'AMEX'
);

-- 2. 기존 데이터 검증 (NULL 또는 유효하지 않은 값 체크)
do $$
begin
  -- NULL 체크
  if exists (select 1 from public.stock_master where exchange is null) then
    raise exception 'stock_master 테이블에 exchange가 NULL인 데이터가 존재합니다.';
  end if;

  -- 유효하지 않은 값 체크
  if exists (
    select 1 from public.stock_master
    where exchange not in ('KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ', 'AMEX')
  ) then
    raise exception 'stock_master 테이블에 유효하지 않은 exchange 값이 존재합니다.';
  end if;
end $$;

-- 3. 컬럼 타입 변경 (text -> exchange_type, NOT NULL)
alter table public.stock_master
  alter column exchange type exchange_type using exchange::exchange_type,
  alter column exchange set not null;
