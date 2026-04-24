-- ledger_entries에 title 컬럼 추가
-- memo와 분리: title(내용/제목), memo(부가 설명)
alter table public.ledger_entries
  add column title text;
