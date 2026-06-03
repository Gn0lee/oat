drop index if exists public.record_change_requests_pending_unique;

create unique index record_change_requests_pending_unique
  on public.record_change_requests(requester_id, target_type, target_id)
  where status = 'pending';
