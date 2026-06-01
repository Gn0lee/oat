-- User Notification foundation

create type notification_type as enum (
  'ledger_record_change_request',
  'stock_transaction_change_request',
  'ledger_request_result',
  'stock_transaction_request_result',
  'ledger_record_changed',
  'stock_transaction_changed',
  'ledger_record_created',
  'stock_transaction_created',
  'invitation_accepted'
);

create type notification_link_kind as enum (
  'ledger_record_date',
  'stock_record_date',
  'record_change_request_detail',
  'household_settings',
  'notification_settings'
);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  household_id  uuid references public.households(id) on delete cascade,
  type          notification_type not null,
  title         text not null,
  body          text,
  link_kind     notification_link_kind,
  link_params   jsonb not null default '{}'::jsonb,
  source_type   text,
  source_id     uuid,
  dedupe_key    text,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),

  constraint notifications_source_pair_check check (
    (source_type is null and source_id is null)
    or (source_type is not null and source_id is not null)
  ),
  constraint notifications_link_params_object_check check (
    jsonb_typeof(link_params) = 'object'
  )
);

create index notifications_recipient_created_at_idx
  on public.notifications(recipient_id, created_at desc, id desc);

create index notifications_recipient_unread_idx
  on public.notifications(recipient_id)
  where read_at is null;

create unique index notifications_recipient_dedupe_key_unique
  on public.notifications(recipient_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (recipient_id = (select auth.uid()));

create policy "Users can mark own notifications as read"
  on public.notifications for update
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create table public.notification_preferences (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           notification_type not null,
  in_app_enabled boolean not null,
  push_enabled   boolean not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, type)
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (user_id = (select auth.uid()));

create policy "Users can upsert own notification preferences"
  on public.notification_preferences for insert
  with check (user_id = (select auth.uid()));

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
