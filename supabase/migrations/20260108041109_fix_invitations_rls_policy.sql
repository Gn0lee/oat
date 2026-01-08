-- invitations RLS 정책 수정: auth.users 대신 auth.jwt() 사용
-- auth.users 테이블은 일반 사용자가 접근할 수 없음

-- 기존 정책 삭제
drop policy if exists "Users can view invitations by email or household" on public.invitations;

-- 수정된 정책: auth.jwt()에서 이메일 추출
create policy "Users can view invitations by email or household"
  on public.invitations for select
  using (
    is_household_member(household_id)
    or email = (auth.jwt()->>'email')
  );

-- INSERT 정책 추가 (가구 멤버만 초대 생성 가능)
drop policy if exists "Household members can create invitations" on public.invitations;
create policy "Household members can create invitations"
  on public.invitations for insert
  with check (
    is_household_member(household_id)
  );

-- UPDATE 정책 추가 (가구 멤버만 상태 변경 가능)
drop policy if exists "Household members can update invitations" on public.invitations;
create policy "Household members can update invitations"
  on public.invitations for update
  using (
    is_household_member(household_id)
  );

-- DELETE 정책 추가 (가구 멤버만 삭제 가능)
drop policy if exists "Household members can delete invitations" on public.invitations;
create policy "Household members can delete invitations"
  on public.invitations for delete
  using (
    is_household_member(household_id)
  );
