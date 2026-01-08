-- handle_new_user 함수 업데이트: 초대를 통한 가입 지원
-- 관련 이슈: #120
--
-- 변경 사항:
-- 1. 이메일로 pending 상태의 초대가 있는지 확인
-- 2. 초대가 있으면 해당 가구에 member로 합류
-- 3. 초대가 없으면 기존처럼 새 가구 생성 (owner)

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_invitation record;
  new_household_id uuid;
begin
  -- 1. Create profile
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));

  -- 2. Check for pending invitation
  select * into v_invitation
  from public.invitations
  where email = new.email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    -- 초대를 통한 가입: 기존 가구에 member로 합류
    insert into public.household_members (household_id, user_id, role)
    values (v_invitation.household_id, new.id, 'member');

    -- 초대 상태 업데이트
    update public.invitations
    set status = 'accepted'
    where id = v_invitation.id;
  else
    -- 직접 가입: 새 가구 생성 후 owner로 설정
    insert into public.households (name)
    values ('우리집')
    returning id into new_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'owner');
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';
