-- transactions (거래 기록)

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  ticker text not null,
  type transaction_type not null,
  quantity numeric(18, 8) not null check (quantity > 0),
  price numeric(18, 4) not null check (price >= 0),
  memo text,
  transacted_at timestamptz not null,  -- 실제 거래일
  created_at timestamptz default now() not null
);

-- 인덱스
create index transactions_household_id_idx on public.transactions(household_id);
create index transactions_owner_id_idx on public.transactions(owner_id);
create index transactions_ticker_idx on public.transactions(ticker);
create index transactions_transacted_at_idx on public.transactions(transacted_at);
