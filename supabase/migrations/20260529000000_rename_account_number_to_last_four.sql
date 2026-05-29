-- 계좌번호 민감정보 정리 (Issue #308)
-- 기존 account_number(전체 계좌번호)를 last_four(뒤 4자리)로 변환

-- 1. 기존 데이터를 뒤 4자리로 변환
UPDATE public.accounts
SET account_number = RIGHT(account_number, 4)
WHERE account_number IS NOT NULL
  AND length(account_number) > 4;

-- 2. 컬럼명 변경: account_number → last_four
ALTER TABLE public.accounts RENAME COLUMN account_number TO last_four;

-- 3. 길이 제약 추가: 숫자 4자리만 허용 (NULL 허용)
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_last_four_check
  CHECK (last_four IS NULL OR last_four ~ '^\d{4}$');
