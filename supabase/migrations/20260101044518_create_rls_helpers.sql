-- RLS Helper Functions
-- 가구 단위 데이터 격리를 위한 헬퍼 함수들

-- 사용자가 속한 household_id 목록 조회
create or replace function get_user_household_ids()
returns setof uuid as $$
  select household_id
  from public.household_members
  where user_id = (select auth.uid())
$$ language sql security definer stable set search_path = '';

-- 사용자가 특정 가구의 멤버인지 확인
create or replace function is_household_member(hh_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh_id and user_id = (select auth.uid())
  )
$$ language sql security definer stable set search_path = '';

-- 사용자가 특정 가구의 owner인지 확인
create or replace function is_household_owner(hh_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh_id and user_id = (select auth.uid()) and role = 'owner'
  )
$$ language sql security definer stable set search_path = '';

-- 사용자가 admin인지 확인
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$ language sql security definer stable set search_path = '';
