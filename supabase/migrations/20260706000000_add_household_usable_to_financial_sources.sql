alter table public.accounts
  add column is_household_usable boolean not null default false;

alter table public.payment_methods
  add column is_household_usable boolean not null default false;
