-- transactions 테이블의 account_id를 필수로 변경
-- 기존 데이터가 없는 상태에서만 실행 가능

alter table public.transactions
  alter column account_id set not null;
