create type balance_adjustment_target_type as enum (
  'account',
  'payment_method'
);

create table public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_type balance_adjustment_target_type not null,
  account_id uuid references public.accounts(id) on delete cascade,
  payment_method_id uuid references public.payment_methods(id) on delete cascade,
  previous_balance numeric(18, 2) not null,
  actual_balance numeric(18, 2) not null,
  delta numeric(18, 2) not null,
  title text not null default '잔액 맞춤',
  memo text,
  adjusted_at timestamptz not null,
  created_at timestamptz default now() not null,

  constraint balance_adjustments_target_check check (
    (
      target_type = 'account'
      and account_id is not null
      and payment_method_id is null
    )
    or
    (
      target_type = 'payment_method'
      and payment_method_id is not null
      and account_id is null
    )
  )
);

create index balance_adjustments_household_adjusted_at_idx
  on public.balance_adjustments(household_id, adjusted_at desc, id desc);

create index balance_adjustments_account_adjusted_at_idx
  on public.balance_adjustments(account_id, adjusted_at desc)
  where account_id is not null;

create index balance_adjustments_payment_method_adjusted_at_idx
  on public.balance_adjustments(payment_method_id, adjusted_at desc)
  where payment_method_id is not null;

alter table public.balance_adjustments enable row level security;

create policy "Household members can view balance adjustments"
  on public.balance_adjustments for select
  using (public.is_household_member(household_id));

create policy "Users can create own balance adjustments"
  on public.balance_adjustments for insert
  with check (
    public.is_household_member(household_id)
    and owner_id = (select auth.uid())
  );

comment on table public.balance_adjustments is
  'Correction events that set a managed account or auxiliary payment method balance to an actual balance.';
