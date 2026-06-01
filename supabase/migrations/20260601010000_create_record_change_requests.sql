-- Record Change Request foundation

create type record_change_request_target_type as enum (
  'ledger_entry',
  'stock_transaction'
);

create type record_change_request_type as enum (
  'update',
  'delete'
);

create type record_change_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create table public.record_change_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_owner_id uuid not null references public.profiles(id) on delete cascade,
  target_type record_change_request_target_type not null,
  target_id uuid not null,
  request_type record_change_request_type not null,
  status record_change_request_status not null default 'pending',
  message text,
  proposed_changes jsonb not null default '{}'::jsonb,
  target_snapshot jsonb not null default '{}'::jsonb,
  response_message text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint record_change_requests_non_owner_check
    check (requester_id <> target_owner_id),
  constraint record_change_requests_proposed_changes_object_check
    check (jsonb_typeof(proposed_changes) = 'object'),
  constraint record_change_requests_target_snapshot_object_check
    check (jsonb_typeof(target_snapshot) = 'object')
);

create index record_change_requests_requester_created_at_idx
  on public.record_change_requests(requester_id, created_at desc, id desc);

create index record_change_requests_target_owner_created_at_idx
  on public.record_change_requests(target_owner_id, created_at desc, id desc);

create index record_change_requests_target_idx
  on public.record_change_requests(target_type, target_id);

create unique index record_change_requests_pending_unique
  on public.record_change_requests(requester_id, target_type, target_id, request_type)
  where status = 'pending';

alter table public.record_change_requests enable row level security;

create policy "Users can view own record change requests"
  on public.record_change_requests for select
  using (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  );

create policy "Users can create own record change requests"
  on public.record_change_requests for insert
  with check (requester_id = (select auth.uid()));

create policy "Users can update own actionable record change requests"
  on public.record_change_requests for update
  using (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  )
  with check (
    requester_id = (select auth.uid())
    or target_owner_id = (select auth.uid())
  );
