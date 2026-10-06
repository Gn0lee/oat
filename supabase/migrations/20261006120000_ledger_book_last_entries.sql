-- Recently used books (#460): latest entry input time (created_at) per book.
-- RLS on ledger_entries remains the visibility boundary (SECURITY INVOKER), so another
-- member's personal book and other households never appear in the result.

create index if not exists ledger_entries_book_id_created_at_idx
  on public.ledger_entries (book_id, created_at desc);

create or replace function public.ledger_book_last_entries(hh_id uuid)
returns table (book_id uuid, last_entry_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select le.book_id, max(le.created_at) as last_entry_at
  from public.ledger_entries le
  where le.household_id = hh_id
  group by le.book_id;
$$;

revoke execute on function public.ledger_book_last_entries(uuid) from public, anon;
grant execute on function public.ledger_book_last_entries(uuid) to authenticated;
