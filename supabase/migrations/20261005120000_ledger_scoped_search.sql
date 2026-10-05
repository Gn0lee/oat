-- All-books / single-book ledger title·memo search with a stable keyset cursor (#445).
-- RLS on ledger_entries remains the visibility boundary (SECURITY INVOKER). The legacy
-- search_ledger_entries(scope, offset) RPC is kept for older clients until #446.

create or replace function public.search_ledger_entries_scoped(
  hh_id uuid,
  search_query text,
  p_book_id uuid default null,
  cursor_transacted_at timestamptz default null,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 21
)
returns setof public.ledger_entries
language sql
stable
security invoker
set search_path = ''
as $$
  with search_pattern as (
    select replace(
      replace(
        replace(btrim(search_query), E'\\', E'\\\\'),
        '%',
        E'\\' || '%'
      ),
      '_',
      E'\\' || '_'
    ) as value
  )
  select le.*
  from public.ledger_entries le, search_pattern pattern
  where le.household_id = hh_id
    and char_length(regexp_replace(btrim(search_query), '\s', '', 'g')) >= 2
    and (p_book_id is null or le.book_id = p_book_id)
    and (
      le.title ilike '%' || pattern.value || '%' escape E'\\'
      or le.memo ilike '%' || pattern.value || '%' escape E'\\'
    )
    and (
      cursor_transacted_at is null or cursor_created_at is null or cursor_id is null
      or (le.transacted_at, le.created_at, le.id)
        < (cursor_transacted_at, cursor_created_at, cursor_id)
    )
  order by le.transacted_at desc, le.created_at desc, le.id desc
  limit least(greatest(result_limit, 1), 51);
$$;

revoke execute on function public.search_ledger_entries_scoped(uuid, text, uuid, timestamptz, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.search_ledger_entries_scoped(uuid, text, uuid, timestamptz, timestamptz, uuid, integer)
  to authenticated;
