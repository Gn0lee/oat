-- accounts 테이블 생성
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  broker text,
  account_number text,
  account_type text,
  is_default boolean default false,
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (household_id, owner_id, name)
);

-- 인덱스
create index accounts_household_id_idx on public.accounts(household_id);
create index accounts_owner_id_idx on public.accounts(owner_id);

-- RLS 활성화
alter table public.accounts enable row level security;

-- RLS 정책: 가구 멤버만 조회 가능
create policy "Users can view household accounts"
  on public.accounts for select
  using (is_household_member(household_id));

-- RLS 정책: 가구 멤버만 생성 가능
create policy "Users can insert household accounts"
  on public.accounts for insert
  with check (is_household_member(household_id));

-- RLS 정책: 본인 계좌만 수정 가능
create policy "Users can update own accounts"
  on public.accounts for update
  using (is_household_member(household_id) and owner_id = (select auth.uid()));

-- RLS 정책: 본인 계좌만 삭제 가능
create policy "Users can delete own accounts"
  on public.accounts for delete
  using (is_household_member(household_id) and owner_id = (select auth.uid()));
