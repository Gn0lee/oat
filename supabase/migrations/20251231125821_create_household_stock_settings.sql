-- household_stock_settings (가구별 종목 설정)

create table public.household_stock_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ticker text not null,
  name text not null,
  asset_type asset_type not null default 'equity',
  market market_type not null default 'KR',
  currency currency_type not null default 'KRW',
  risk_level risk_level,  -- null이면 asset_type 기본값 사용
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique (household_id, ticker)
);

-- 인덱스
create index household_stock_settings_household_id_idx
  on public.household_stock_settings(household_id);
create index household_stock_settings_ticker_idx
  on public.household_stock_settings(ticker);
