-- exchange_rates (환율)
-- 일 1회 ExchangeRate-API에서 동기화.

create table public.exchange_rates (
  from_currency currency_type not null,
  to_currency currency_type not null,
  rate numeric(18, 6) not null,
  updated_at timestamptz default now(),

  primary key (from_currency, to_currency)
);
