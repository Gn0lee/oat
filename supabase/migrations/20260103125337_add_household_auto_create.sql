-- Add household auto-creation when a new user signs up
-- Updates handle_new_user() to also create a household and add the user as owner
--
-- TODO: 초대 플로우 구현 시 고려 사항
-- 1. 초대받아서 가입하는 경우 새 가구 생성 대신 기존 가구에 합류해야 함
--    - raw_user_meta_data에 invitation_code 전달하여 분기 처리 필요
-- 2. 기획 검토 필요:
--    - 한 사용자가 여러 가구에 속할 수 있는가?
--    - 이미 가구가 있는 사용자가 초대받으면 어떻게 처리?
--    - 가구 owner가 탈퇴하면 어떻게 처리?

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household_id uuid;
begin
  -- 1. Create profile
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));

  -- 2. Create household with default name
  insert into public.households (name)
  values ('우리집')
  returning id into new_household_id;

  -- 3. Add user as household owner
  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer set search_path = '';
