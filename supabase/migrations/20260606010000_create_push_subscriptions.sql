create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint push_subscriptions_endpoint_not_blank_check
    check (length(trim(endpoint)) > 0),
  constraint push_subscriptions_p256dh_not_blank_check
    check (length(trim(p256dh)) > 0),
  constraint push_subscriptions_auth_not_blank_check
    check (length(trim(auth)) > 0)
);

create unique index push_subscriptions_endpoint_unique
  on public.push_subscriptions(endpoint);

create index push_subscriptions_user_active_idx
  on public.push_subscriptions(user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = (select auth.uid()));
