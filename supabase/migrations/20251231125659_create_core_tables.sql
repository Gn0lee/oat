-- Core tables: households, profiles, household_members

-- 1. households (가구 그룹)
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리집',
  created_at timestamptz default now() not null
);

-- 2. profiles (사용자 프로필)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role user_role not null default 'user',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 트리거: Auth 유저 생성 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. household_members (가구 구성원)
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role household_role not null default 'member',
  joined_at timestamptz default now() not null,

  primary key (household_id, user_id)
);

-- 인덱스
create index household_members_user_id_idx on public.household_members(user_id);
create index household_members_household_id_idx on public.household_members(household_id);
