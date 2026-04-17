-- payment_method_type enum 생성
create type payment_method_type as enum (
  'credit_card',  -- 신용카드
  'debit_card',   -- 체크카드
  'prepaid',      -- 선불지갑 (카카오페이머니, 네이버페이머니 등)
  'gift_card',    -- 상품권
  'cash'          -- 현금
);

-- payment_methods 테이블 생성
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type payment_method_type not null,
  linked_account_id uuid references public.accounts(id) on delete set null,
  issuer text,
  last_four text,
  payment_day smallint check (payment_day is null or (payment_day between 1 and 31)),
  is_default boolean default false,
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (household_id, owner_id, name)
);

-- 인덱스
create index payment_methods_household_id_idx on public.payment_methods(household_id);
create index payment_methods_owner_id_idx on public.payment_methods(owner_id);
create index payment_methods_linked_account_id_idx on public.payment_methods(linked_account_id);

-- RLS 활성화
alter table public.payment_methods enable row level security;

create policy "Users can view household payment methods"
  on public.payment_methods for select
  using (is_household_member(household_id));

create policy "Users can insert household payment methods"
  on public.payment_methods for insert
  with check (is_household_member(household_id));

create policy "Users can update own payment methods"
  on public.payment_methods for update
  using (is_household_member(household_id) and owner_id = (select auth.uid()));

create policy "Users can delete own payment methods"
  on public.payment_methods for delete
  using (is_household_member(household_id) and owner_id = (select auth.uid()));
