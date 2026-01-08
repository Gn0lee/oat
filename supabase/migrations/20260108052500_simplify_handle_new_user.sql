-- handle_new_user 함수 단순화: 프로필만 생성
-- 초대 처리는 클라이언트에서 API를 통해 수행
--
-- 변경 이유:
-- Supabase inviteUserByEmail()은 유저를 즉시 생성하고 이메일을 발송함
-- 트리거가 유저 생성 시점에 실행되어 이메일 확인 전에 초대가 수락됨
-- 따라서 트리거에서는 프로필만 생성하고, 가구 연결은 클라이언트에서 처리

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 프로필만 생성 (가구 연결은 클라이언트에서 처리)
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));

  return new;
end;
$$ language plpgsql security definer set search_path = '';
