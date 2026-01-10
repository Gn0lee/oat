-- account_type enum 생성
create type account_type as enum (
  'stock',     -- 주식/증권 계좌
  'savings',   -- 예금 계좌 (보통예금)
  'deposit',   -- 적금 계좌 (정기예금, 정기적금)
  'checking',  -- 입출금 계좌 (월급통장 등)
  'isa',       -- ISA 계좌 (절세 계좌)
  'pension',   -- 연금 계좌 (IRP, 퇴직연금)
  'cma',       -- CMA 계좌
  'other'      -- 기타 계좌
);

-- accounts 테이블의 account_type 컬럼을 enum으로 변경
alter table public.accounts
  alter column account_type type account_type using account_type::account_type;

-- transactions 테이블에 account_id 컬럼 추가 (nullable - 기존 데이터 호환)
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete set null;

-- 인덱스 추가
create index transactions_account_id_idx on public.transactions(account_id);
