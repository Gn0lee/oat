-- invitations 테이블 스키마 변경: 코드 기반 → 이메일 기반
-- 관련 이슈: #119

-- 1. invitation_status enum 생성
create type invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

-- 2. 기존 데이터 삭제 (로컬 개발 환경)
truncate table public.invitations;

-- 3. 기존 컬럼 삭제
alter table public.invitations
  drop column code,
  drop column used_by,
  drop column used_at;

-- 4. 새 컬럼 추가
alter table public.invitations
  add column email text not null,
  add column status invitation_status default 'pending';

-- 5. 유니크 제약 추가 (같은 가구에 같은 이메일로 중복 초대 방지)
alter table public.invitations
  add constraint invitations_household_email_unique unique (household_id, email);

-- 6. 기존 인덱스 제거
drop index if exists invitations_code_idx;

-- 7. 새 인덱스 추가
create index invitations_email_idx on public.invitations(email);
create index invitations_status_idx on public.invitations(status);

-- 8. RLS 정책 업데이트
-- 기존 정책 삭제
drop policy if exists "Anyone can view invitations" on public.invitations;

-- 새 정책: 가구 멤버이거나 본인 이메일로 초대된 경우 조회 가능
create policy "Users can view invitations by email or household"
  on public.invitations for select
  using (
    is_household_member(household_id)
    or email = (select email from auth.users where id = auth.uid())
  );
