-- Indexed title/memo search for ledger history. RLS remains the access boundary.

create index ledger_entries_title_search_idx
  on public.ledger_entries using gin (title extensions.gin_trgm_ops)
  where title is not null;

create index ledger_entries_memo_search_idx
  on public.ledger_entries using gin (memo extensions.gin_trgm_ops)
  where memo is not null;

create or replace function public.search_ledger_entries(
  hh_id uuid,
  search_query text,
  search_scope text,
  result_offset integer default 0,
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
    and (
      (search_scope = 'shared' and le.is_shared = true)
      or (
        search_scope = 'personal'
        and le.is_shared = false
        and le.owner_id = (select auth.uid())
      )
    )
    and (
      le.title ilike '%' || pattern.value || '%' escape E'\\'
      or le.memo ilike '%' || pattern.value || '%' escape E'\\'
    )
  order by le.transacted_at desc, le.created_at desc, le.id desc
  offset greatest(result_offset, 0)
  limit least(greatest(result_limit, 1), 51);
$$;

revoke execute on function public.search_ledger_entries(uuid, text, text, integer, integer)
  from public, anon;
grant execute on function public.search_ledger_entries(uuid, text, text, integer, integer)
  to authenticated;
