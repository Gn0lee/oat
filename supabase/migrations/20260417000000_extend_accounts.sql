-- account_category enum 생성
create type account_category as enum ('bank', 'investment');

-- accounts 테이블에 컬럼 추가
alter table public.accounts
  add column category account_category,
  add column balance numeric(18, 2),
  add column balance_updated_at timestamptz;
