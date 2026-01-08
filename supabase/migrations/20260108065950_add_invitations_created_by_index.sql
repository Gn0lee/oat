-- invitations 테이블 created_by 외래키 인덱스 추가
-- 관련 이슈: #85
-- Supabase Performance Advisor 경고 해결

create index if not exists invitations_created_by_idx
on public.invitations (created_by);
