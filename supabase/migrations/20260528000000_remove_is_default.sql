-- Remove is_default column from accounts and payment_methods
alter table public.accounts drop column if exists is_default;
alter table public.payment_methods drop column if exists is_default;
