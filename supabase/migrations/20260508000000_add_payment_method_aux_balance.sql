alter table public.payment_methods
  add column balance numeric(18, 2),
  add column balance_updated_at timestamptz,
  add constraint payment_methods_balance_non_negative
    check (balance is null or balance >= 0);

comment on column public.payment_methods.balance is
  'Auxiliary ledger balance for prepaid, gift_card, and cash payment methods. Excluded from total assets.';
