alter table public.payment_methods
  drop constraint if exists payment_methods_balance_non_negative;

comment on column public.payment_methods.balance is
  'Auxiliary ledger balance for prepaid, gift_card, and cash payment methods. May be negative when records are incomplete; excluded from total assets.';
