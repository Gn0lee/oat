-- Stage 2: install the resumable operator entrypoint; do not run a table-wide UPDATE.
create function ledger_books_private.assert_reconciled(p_require_books boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  entry public.ledger_entries;
begin
  if p_require_books and exists (select 1 from public.ledger_entries where book_id is null) then
    raise exception using errcode = '23514', message = 'LEDGER_BACKFILL_INCOMPLETE';
  end if;
  if exists (
    select 1 from public.households h where
      (p_require_books or exists (select 1 from public.ledger_books b where b.household_id = h.id))
      and (select count(*) from public.ledger_books b where b.household_id = h.id
        and b.is_default and b.visibility = 'shared' and b.archived_at is null) <> 1
  ) then
    raise exception using errcode = '23514', message = 'BOOK_DEFAULT_REQUIRED';
  end if;
  if exists (
    select 1 from public.ledger_books b where b.created_by is not null
      and not exists (select 1 from public.household_members m
        where m.household_id = b.household_id and m.user_id = b.created_by)
  ) then
    raise exception using errcode = '23514', message = 'BOOK_CREATOR_NOT_MEMBER';
  end if;
  for entry in select * from public.ledger_entries order by household_id, id loop
    perform ledger_books_private.assert_entry_relationships(entry);
    if entry.book_id is not null then
      -- Archived historical records remain valid and readable.
      perform ledger_books_private.assert_entry_book(entry, false);
    end if;
  end loop;
  if exists (
    select 1 from public.ledger_entry_tags link
    left join public.ledger_entries e on e.id = link.ledger_entry_id
    left join public.ledger_tags t on t.id = link.tag_id
    where e.id is null or t.id is null or e.household_id is distinct from link.household_id
      or t.household_id is distinct from link.household_id
  ) then
    raise exception using errcode = '23514', message = 'LEDGER_TAG_HOUSEHOLD_MISMATCH';
  end if;
end;
$$;
revoke all on function ledger_books_private.assert_reconciled(boolean) from public, anon, authenticated;

create function public.backfill_ledger_books(p_batch_size integer default 500)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  hh_id uuid;
  entry public.ledger_entries;
  migrated public.ledger_entries;
  target_book_id uuid;
  updated_count integer := 0;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 5000 then
    raise exception using errcode = '22023', message = 'batch_size must be between 1 and 5000';
  end if;
  -- A batch bounds both household seeds and entry updates. Empty households must
  -- be drained too; the returned entry count alone is never a completion signal.
  for hh_id in
    select h.id from public.households h
    where not exists (select 1 from public.ledger_books b where b.household_id = h.id and b.is_default)
      or exists (select 1 from public.ledger_entries e where e.household_id = h.id and e.book_id is null)
    order by h.id limit p_batch_size
  loop
    perform ledger_books_private.seed_household(hh_id);
    for entry in
      select * from public.ledger_entries where household_id = hh_id and book_id is null
      order by id limit (p_batch_size - updated_count) for update skip locked
    loop
      -- Check before resolving; never repair owners/endpoints or broaden visibility.
      perform ledger_books_private.assert_entry_relationships(entry);
      target_book_id := ledger_books_private.resolve_historical_book(hh_id, entry.owner_id, entry.is_shared);
      update public.ledger_entries set book_id = target_book_id
        where id = entry.id and book_id is null returning * into migrated;
      if found then
        if (to_jsonb(migrated) - 'book_id') is distinct from (to_jsonb(entry) - 'book_id') then
          raise exception using errcode = '23514', message = 'LEDGER_BACKFILL_CHANGED_ORIGINAL_FIELDS';
        end if;
        updated_count := updated_count + 1;
      end if;
    end loop;
  end loop;
  return updated_count;
end;
$$;
-- The ACL is the boundary: no user-controlled GUC, auth.uid exception, or generic
-- definer entrypoint permits authenticated callers to bypass the write guards.
revoke all on function public.backfill_ledger_books(integer) from public, anon, authenticated;
grant execute on function public.backfill_ledger_books(integer) to service_role;
