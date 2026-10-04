-- Stage 1: expand only. Do not apply the validation/enforcement stages to an
-- existing database until separately committed backfill batches and reconciliation pass.
-- Retain is_shared, the legacy search RPC signature/grants and all existing indexes.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create schema ledger_books_private;
revoke all on schema ledger_books_private from public, anon, authenticated;

create table public.ledger_books (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  visibility text not null check (visibility in ('shared', 'personal')),
  created_by uuid references public.profiles(id) on delete restrict,
  archived_at timestamptz,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ledger_books_household_id_id_key unique (household_id, id),
  constraint ledger_books_name_check check (name = btrim(name) and name <> ''),
  constraint ledger_books_personal_creator_check check (visibility <> 'personal' or created_by is not null),
  constraint ledger_books_default_check check (not is_default or (visibility = 'shared' and archived_at is null))
);

-- Archived names remain reserved in their original scope.
create unique index ledger_books_shared_name_key
  on public.ledger_books (household_id, lower(name)) where visibility = 'shared';
create unique index ledger_books_personal_name_key
  on public.ledger_books (household_id, created_by, lower(name)) where visibility = 'personal';
create unique index ledger_books_one_default_key
  on public.ledger_books (household_id) where is_default;
create unique index ledger_books_system_seed_key
  on public.ledger_books (household_id) where visibility = 'shared' and created_by is null;

alter table public.ledger_entries add column book_id uuid;
alter table public.ledger_entries add constraint ledger_entries_household_book_fkey
  foreign key (household_id, book_id) references public.ledger_books(household_id, id)
  on delete restrict not valid;
alter table public.ledger_entries add constraint ledger_entries_book_id_not_null
  check (book_id is not null) not valid;
-- Build the large-table index separately with scripts/ledger-books/index-online.sql
-- so expansion never retains its ALTER TABLE lock during an index scan.

create function ledger_books_private.lock_household(p_household_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- ponytail: household writes serialize; shared household/ordered book locking
  -- can replace this if measured write contention warrants more concurrency.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'ledger-books:household:' || p_household_id::text, 0));
  perform 1 from public.households where id = p_household_id for update;
end;
$$;

create function ledger_books_private.lock_books(p_household_id uuid, p_book_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform ledger_books_private.lock_household(p_household_id);
  perform 1 from public.ledger_books
    where household_id = p_household_id and (p_book_ids is null or id = any(p_book_ids))
    order by id for update;
end;
$$;

create function ledger_books_private.guard_book()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  hh_id uuid;
begin
  hh_id := case when tg_op = 'DELETE' then old.household_id else new.household_id end;
  perform ledger_books_private.lock_books(hh_id, null);
  -- Household cascades remove the whole graph; a surviving household still needs a default.
  if tg_op = 'DELETE' and not exists (select 1 from public.households where id = hh_id) then
    return old;
  end if;
  if current_setting('role', true) = 'authenticated'
    and not (tg_op = 'INSERT' and new.created_by is null) then
    if not public.is_household_member(hh_id) or (tg_op <> 'INSERT'
      and old.visibility = 'personal' and old.created_by is distinct from auth.uid())
      or (tg_op = 'INSERT' and new.created_by is not null and new.created_by is distinct from auth.uid()) then
      raise exception using errcode = '42501', message = 'BOOK_ACTION_FORBIDDEN';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if row(new.id, new.household_id, new.visibility, new.created_by, new.created_at)
      is distinct from row(old.id, old.household_id, old.visibility, old.created_by, old.created_at) then
      raise exception using errcode = '23514', message = 'BOOK_IDENTITY_IMMUTABLE';
    end if;
    if old.archived_at is not null and (
      new.archived_at is not null or
      (to_jsonb(new) - 'archived_at' - 'updated_at') is distinct from
      (to_jsonb(old) - 'archived_at' - 'updated_at')
    ) then
      raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
    end if;
    if new.is_default is distinct from old.is_default and current_setting('role', true) = 'authenticated'
      and not public.is_household_owner(hh_id) then
      raise exception using errcode = '42501', message = 'BOOK_ACTION_FORBIDDEN';
    end if;
    if old.visibility = 'personal' and lower(old.name) = lower('개인 생활비')
      and btrim(new.name) is distinct from old.name then
      raise exception using errcode = '23514', message = 'BOOK_LEGACY_PROTECTED';
    end if;
    new.updated_at := now();
  elsif tg_op = 'DELETE' then
    if old.archived_at is not null then
      raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
    end if;
    if old.is_default then
      raise exception using errcode = '23514', message = 'BOOK_DEFAULT_REQUIRED';
    end if;
    if old.visibility = 'personal' and lower(old.name) = lower('개인 생활비') then
      raise exception using errcode = '23514', message = 'BOOK_LEGACY_PROTECTED';
    end if;
    if exists (select 1 from public.ledger_entries where household_id = hh_id and (
      book_id = old.id or (book_id is null and is_shared and old.visibility = 'shared' and old.created_by is null)
    )) then
      raise exception using errcode = '23503', message = 'BOOK_NOT_EMPTY';
    end if;
    return old;
  else
    if new.created_by is null then
      -- Only the system seed has no creator; client RLS additionally requires auth.uid().
      if new.visibility <> 'shared' or btrim(new.name) <> '생활비' or not new.is_default
        or new.archived_at is not null or exists (select 1 from public.ledger_books where household_id = hh_id) then
        raise exception using errcode = '23514', message = 'BOOK_CREATOR_REQUIRED';
      end if;
    elsif not exists (
      select 1 from public.household_members where household_id = hh_id and user_id = new.created_by
    ) then
      raise exception using errcode = '23514', message = 'BOOK_CREATOR_NOT_MEMBER';
    end if;
    if new.is_default and current_setting('role', true) = 'authenticated' and new.created_by is not null
      and not public.is_household_owner(hh_id) then
      raise exception using errcode = '42501', message = 'BOOK_ACTION_FORBIDDEN';
    end if;
  end if;
  new.name := btrim(new.name);
  return new;
end;
$$;

create trigger ledger_books_guard before insert or update or delete on public.ledger_books
  for each row execute function ledger_books_private.guard_book();

create function ledger_books_private.check_default()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  hh_id uuid;
begin
  if tg_table_name = 'households' then
    hh_id := new.id;
  else
    hh_id := case when tg_op = 'DELETE' then old.household_id else new.household_id end;
  end if;
  perform ledger_books_private.lock_books(hh_id, null);
  if exists (select 1 from public.households where id = hh_id) and (
    select count(*) from public.ledger_books
    where household_id = hh_id and is_default and visibility = 'shared' and archived_at is null
  ) <> 1 then
    raise exception using errcode = '23514', message = 'BOOK_DEFAULT_REQUIRED';
  end if;
  return null;
end;
$$;

create constraint trigger ledger_books_exactly_one_default
  after insert or update or delete on public.ledger_books
  deferrable initially deferred for each row execute function ledger_books_private.check_default();
create constraint trigger households_exactly_one_ledger_default
  after insert on public.households
  deferrable initially deferred for each row execute function ledger_books_private.check_default();

create function ledger_books_private.seed_household(p_household_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform ledger_books_private.lock_books(p_household_id, null);
  if not exists (select 1 from public.households where id = p_household_id) then
    raise exception using errcode = '23503', message = 'HOUSEHOLD_UNAVAILABLE';
  end if;
  if not exists (select 1 from public.ledger_books where household_id = p_household_id) then
    insert into public.ledger_books (household_id, name, visibility, is_default)
    values (p_household_id, '생활비', 'shared', true);
  elsif (select count(*) from public.ledger_books
    where household_id = p_household_id and is_default and visibility = 'shared' and archived_at is null) <> 1 then
    -- A broken nonempty household is an anomaly, never a reason to reset its default.
    raise exception using errcode = '23514', message = 'BOOK_DEFAULT_REQUIRED';
  end if;
end;
$$;

create function ledger_books_private.seed_new_household()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform ledger_books_private.seed_household(new.id);
  return new;
end;
$$;
create trigger households_seed_ledger_book after insert on public.households
  for each row execute function ledger_books_private.seed_new_household();

create function ledger_books_private.resolve_legacy_book(
  p_household_id uuid, p_owner_id uuid, p_is_shared boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result public.ledger_books;
begin
  perform ledger_books_private.seed_household(p_household_id);
  if p_is_shared is null or not exists (
    select 1 from public.household_members where household_id = p_household_id and user_id = p_owner_id
  ) then
    raise exception using errcode = '23514', message = 'LEDGER_OWNER_NOT_MEMBER';
  end if;
  if p_is_shared then
    select * into result from public.ledger_books where household_id = p_household_id and is_default;
  else
    select * into result from public.ledger_books where household_id = p_household_id
      and visibility = 'personal' and created_by = p_owner_id and lower(name) = lower('개인 생활비');
    if not found then
      insert into public.ledger_books (household_id, name, visibility, created_by)
      values (p_household_id, '개인 생활비', 'personal', p_owner_id) returning * into result;
    end if;
  end if;
  if result.id is null then
    raise exception using errcode = '23514', message = 'BOOK_UNAVAILABLE';
  end if;
  if result.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  return result.id;
end;
$$;

-- Old NULL rows retain the original system seed even after a default swap or
-- rename. New legacy INSERTs continue to use resolve_legacy_book/current default.
create function ledger_books_private.resolve_historical_book(
  p_household_id uuid, p_owner_id uuid, p_is_shared boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  book public.ledger_books;
begin
  if not p_is_shared then
    return ledger_books_private.resolve_legacy_book(p_household_id, p_owner_id, false);
  end if;
  perform ledger_books_private.seed_household(p_household_id);
  select * into book from public.ledger_books
    where household_id = p_household_id and visibility = 'shared' and created_by is null;
  if not found then raise exception using errcode = '23514', message = 'BOOK_UNAVAILABLE'; end if;
  if book.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  return book.id;
end;
$$;

-- Shared by entry guards and reconciliation. Never change anomalous relationships.
create function ledger_books_private.assert_entry_relationships(
  p_entry public.ledger_entries, p_enforce_source_permissions boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_entry.amount <= 0 or p_entry.amount::text in ('NaN', 'Infinity', '-Infinity')
    or not isfinite(p_entry.transacted_at) then
    raise exception using errcode = '23514', message = 'LEDGER_INVALID_ORIGINAL_MONEY_OR_DATE';
  end if;
  if not exists (select 1 from public.household_members
    where household_id = p_entry.household_id and user_id = p_entry.owner_id) then
    raise exception using errcode = '23514', message = 'LEDGER_OWNER_NOT_MEMBER';
  end if;
  if p_entry.category_id is not null and not exists (
    select 1 from public.categories where id = p_entry.category_id and household_id = p_entry.household_id
  ) then
    raise exception using errcode = '23514', message = 'LEDGER_CATEGORY_FORBIDDEN';
  end if;
  if exists (select 1 from public.ledger_entry_tags link
    left join public.ledger_tags tag on tag.id = link.tag_id
    where link.ledger_entry_id = p_entry.id and (tag.id is null
      or link.household_id <> p_entry.household_id or tag.household_id <> p_entry.household_id)) then
    raise exception using errcode = '23514', message = 'LEDGER_TAG_HOUSEHOLD_MISMATCH';
  end if;
  if exists (
    select 1 from unnest(array[p_entry.from_account_id, p_entry.to_account_id]) as ref(id)
    where ref.id is not null and not exists (
      select 1 from public.accounts a where a.id = ref.id and a.household_id = p_entry.household_id
        and (not p_enforce_source_permissions or a.owner_id = p_entry.owner_id
          or (p_entry.is_shared and a.is_household_usable))
    )
  ) or exists (
    select 1 from unnest(array[p_entry.from_payment_method_id, p_entry.to_payment_method_id]) as ref(id)
    where ref.id is not null and not exists (
      select 1 from public.payment_methods pm where pm.id = ref.id and pm.household_id = p_entry.household_id
        and (not p_enforce_source_permissions or pm.owner_id = p_entry.owner_id
          or (p_entry.is_shared and pm.is_household_usable))
        and (pm.linked_account_id is null or exists (
          select 1 from public.accounts a where a.id = pm.linked_account_id and a.household_id = p_entry.household_id
        ))
    )
  ) then
    raise exception using errcode = '23514', message = 'LEDGER_FINANCIAL_SOURCE_FORBIDDEN';
  end if;
end;
$$;

create function ledger_books_private.assert_entry_book(p_entry public.ledger_entries, p_require_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  book public.ledger_books;
begin
  select * into book from public.ledger_books where id = p_entry.book_id and household_id = p_entry.household_id;
  if not found or (book.visibility = 'personal' and book.created_by is distinct from p_entry.owner_id) then
    raise exception using errcode = '23514', message = 'BOOK_UNAVAILABLE';
  end if;
  if p_require_active and book.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  if p_entry.is_shared is distinct from (book.visibility = 'shared') then
    raise exception using errcode = '23514', message = 'LEDGER_VISIBILITY_MISMATCH';
  end if;
end;
$$;

create function ledger_books_private.guard_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  source public.ledger_entries;
  book public.ledger_books;
  hh_id uuid;
begin
  hh_id := case when tg_op = 'DELETE' then old.household_id else new.household_id end;
  if tg_op = 'UPDATE' and row(new.id, new.household_id, new.owner_id)
    is distinct from row(old.id, old.household_id, old.owner_id) then
    raise exception using errcode = '23514', message = 'LEDGER_IDENTITY_IMMUTABLE';
  end if;
  perform ledger_books_private.lock_books(hh_id, null);
  if tg_op = 'DELETE' and not exists (select 1 from public.households where id = hh_id) then
    return old;
  end if;
  if current_setting('role', true) = 'authenticated' and (
    not public.is_household_member(hh_id) or auth.uid() is distinct from
      (case when tg_op = 'DELETE' then old.owner_id else new.owner_id end)
  ) then
    raise exception using errcode = '42501', message = 'LEDGER_FORBIDDEN';
  end if;
  if tg_op <> 'INSERT' then
    source := old;
    if source.book_id is null then
      source.book_id := ledger_books_private.resolve_historical_book(hh_id, source.owner_id, source.is_shared);
    end if;
    perform ledger_books_private.assert_entry_book(source, true);
    perform ledger_books_private.assert_entry_relationships(source);
    if tg_op = 'DELETE' then return old; end if;
    if new.book_id is not distinct from old.book_id and new.is_shared is distinct from old.is_shared then
      raise exception using errcode = '23514', message = 'LEDGER_LEGACY_VISIBILITY_UPDATE_FORBIDDEN';
    end if;
  end if;
  if new.book_id is null then
    if tg_op = 'UPDATE' and old.book_id is not null then
      raise exception using errcode = '23514', message = 'BOOK_UNAVAILABLE';
    end if;
    if tg_op = 'UPDATE' then
      new.book_id := source.book_id;
    else
      new.book_id := ledger_books_private.resolve_legacy_book(hh_id, new.owner_id, new.is_shared);
    end if;
  end if;
  select * into book from public.ledger_books where id = new.book_id and household_id = hh_id;
  if not found then
    raise exception using errcode = '23514', message = 'BOOK_UNAVAILABLE';
  end if;
  new.is_shared := book.visibility = 'shared';
  perform ledger_books_private.assert_entry_book(new, true);
  -- Historical sharing can be revoked later. Recheck authorization only when
  -- introducing a new entry or changing its money/financial endpoints.
  perform ledger_books_private.assert_entry_relationships(new, tg_op = 'INSERT' or
    row(new.type, new.amount, new.from_account_id, new.from_payment_method_id, new.to_account_id, new.to_payment_method_id)
    is distinct from row(old.type, old.amount, old.from_account_id, old.from_payment_method_id, old.to_account_id, old.to_payment_method_id));
  -- Deliberately leave every original field, including both timestamps, untouched.
  return new;
end;
$$;
create trigger ledger_entries_book_guard before insert or update or delete on public.ledger_entries
  for each row execute function ledger_books_private.guard_entry();

create function ledger_books_private.guard_entry_tag()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  link public.ledger_entry_tags;
  entry public.ledger_entries;
  hh_id uuid;
begin
  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception using errcode = '23514', message = 'LEDGER_TAG_HOUSEHOLD_MISMATCH';
  end if;
  hh_id := case when tg_op = 'DELETE' then old.household_id else new.household_id end;
  perform ledger_books_private.lock_books(hh_id, null);
  if tg_op = 'DELETE' and not exists (select 1 from public.households where id = hh_id) then return old; end if;
  -- Check both ends of an UPDATE so a tag link cannot be moved out of an archive.
  for link in
    select old.* where tg_op <> 'INSERT'
    union all select new.* where tg_op <> 'DELETE'
  loop
    select * into entry from public.ledger_entries where id = link.ledger_entry_id for update;
    if not found then
      if tg_op = 'DELETE' then continue; end if; -- entry ON DELETE CASCADE
      raise exception using errcode = '23503', message = 'LEDGER_UNAVAILABLE';
    end if;
    if current_setting('role', true) = 'authenticated' and (
      not public.is_household_member(entry.household_id) or entry.owner_id is distinct from auth.uid()
    ) then
      raise exception using errcode = '42501', message = 'LEDGER_FORBIDDEN';
    end if;
    if entry.household_id is distinct from link.household_id or not exists (
      select 1 from public.ledger_tags where id = link.tag_id and household_id = link.household_id
    ) then
      -- During a tag's ON DELETE CASCADE its parent is already gone.
      if tg_op <> 'DELETE' or entry.household_id is distinct from link.household_id then
        raise exception using errcode = '23514', message = 'LEDGER_TAG_HOUSEHOLD_MISMATCH';
      end if;
    end if;
    if entry.book_id is null then
      entry.book_id := ledger_books_private.resolve_historical_book(hh_id, entry.owner_id, entry.is_shared);
    end if;
    perform ledger_books_private.assert_entry_book(entry, true);
    perform ledger_books_private.assert_entry_relationships(entry);
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger ledger_entry_tags_book_guard before insert or update or delete on public.ledger_entry_tags
  for each row execute function ledger_books_private.guard_entry_tag();

create function public.make_default_ledger_book(p_book_id uuid)
returns public.ledger_books language plpgsql security definer set search_path = '' as $$
declare
  book public.ledger_books;
begin
  select * into book from public.ledger_books where id = p_book_id;
  if not found or auth.uid() is null or not public.is_household_member(book.household_id)
    or book.visibility <> 'shared' then
    raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE';
  end if;
  perform ledger_books_private.lock_books(book.household_id, null);
  perform 1 from public.household_members where household_id = book.household_id
    and user_id = auth.uid() and role = 'owner' for share;
  if not found then
    raise exception using errcode = '42501', message = 'BOOK_ACTION_FORBIDDEN';
  end if;
  select * into book from public.ledger_books where id = p_book_id;
  if not found then raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE'; end if;
  if book.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  if not book.is_default then
    -- Callers may have set all constraints IMMEDIATE; the swap still needs its
    -- exact-one check at the end of the transaction, after both updates.
    set constraints public.ledger_books_exactly_one_default deferred;
    update public.ledger_books set is_default = false where household_id = book.household_id and is_default;
    update public.ledger_books set is_default = true where id = p_book_id returning * into book;
  end if;
  return book;
end;
$$;
revoke all on function public.make_default_ledger_book(uuid) from public, anon;
grant execute on function public.make_default_ledger_book(uuid) to authenticated;

alter table public.ledger_books enable row level security;
revoke all on public.ledger_books from public, anon, authenticated;
grant select, insert, update, delete on public.ledger_books to authenticated, service_role;
revoke all on public.ledger_entries, public.ledger_entry_tags from public, anon, authenticated;
grant select, insert, update, delete on public.ledger_entries to authenticated, service_role;
grant select, insert, delete on public.ledger_entry_tags to authenticated;
grant select, insert, update, delete on public.ledger_entry_tags to service_role;
create policy ledger_books_select on public.ledger_books for select to authenticated
  using (public.is_household_member(household_id) and (visibility = 'shared' or created_by = (select auth.uid())));
create policy ledger_books_insert on public.ledger_books for insert to authenticated
  with check (public.is_household_member(household_id) and created_by = (select auth.uid())
    and (not is_default or public.is_household_owner(household_id)));
create policy ledger_books_update on public.ledger_books for update to authenticated
  using (public.is_household_member(household_id) and (visibility = 'shared' or created_by = (select auth.uid())))
  with check (public.is_household_member(household_id) and (visibility = 'shared' or created_by = (select auth.uid())));
create policy ledger_books_delete on public.ledger_books for delete to authenticated
  using (public.is_household_member(household_id) and (
    created_by = (select auth.uid()) or (visibility = 'shared' and public.is_household_owner(household_id))
  ));

drop policy "Users can view shared and own ledger entries" on public.ledger_entries;
drop policy "Users can insert own ledger entries" on public.ledger_entries;
drop policy "Users can update own ledger entries" on public.ledger_entries;
drop policy "Users can delete own ledger entries" on public.ledger_entries;
create policy ledger_entries_select on public.ledger_entries for select to authenticated
  using (public.is_household_member(household_id) and (
    -- The guard enforces personal author = creator. Own-row reads also support
    -- INSERT RETURNING when its BEFORE trigger just created the legacy book.
    owner_id = (select auth.uid())
    or
    (book_id is null and (is_shared or owner_id = (select auth.uid())))
    or exists (select 1 from public.ledger_books b where b.id = book_id and b.household_id = ledger_entries.household_id
      and (b.visibility = 'shared' or (b.created_by = (select auth.uid()) and owner_id = b.created_by)))
  ));
create policy ledger_entries_insert on public.ledger_entries for insert to authenticated
  -- The BEFORE guard validates household, active book and personal creator.
  -- An inline book subquery uses the outer INSERT snapshot and cannot see a
  -- personal book created by that trigger in this very statement.
  with check (public.is_household_member(household_id) and owner_id = (select auth.uid()));
create policy ledger_entries_update on public.ledger_entries for update to authenticated
  using (public.is_household_member(household_id) and owner_id = (select auth.uid()))
  with check (public.is_household_member(household_id) and owner_id = (select auth.uid()));
create policy ledger_entries_delete on public.ledger_entries for delete to authenticated
  using (public.is_household_member(household_id) and owner_id = (select auth.uid()));

drop policy "Users can view ledger entry tags of accessible entries" on public.ledger_entry_tags;
drop policy "Users can insert ledger entry tags for owned entries" on public.ledger_entry_tags;
drop policy "Users can delete ledger entry tags for owned entries" on public.ledger_entry_tags;
create policy ledger_entry_tags_select on public.ledger_entry_tags for select to authenticated
  using (public.is_household_member(household_id) and exists (
    select 1 from public.ledger_entries e where e.id = ledger_entry_id and e.household_id = ledger_entry_tags.household_id
  ));
create policy ledger_entry_tags_insert on public.ledger_entry_tags for insert to authenticated
  with check (public.is_household_member(household_id) and exists (
    select 1 from public.ledger_entries e where e.id = ledger_entry_id and e.household_id = ledger_entry_tags.household_id
      and e.owner_id = (select auth.uid())
  ) and exists (select 1 from public.ledger_tags t where t.id = tag_id and t.household_id = ledger_entry_tags.household_id));
create policy ledger_entry_tags_delete on public.ledger_entry_tags for delete to authenticated
  using (public.is_household_member(household_id) and exists (
    select 1 from public.ledger_entries e where e.id = ledger_entry_id and e.household_id = ledger_entry_tags.household_id
      and e.owner_id = (select auth.uid())
  ));

-- Trigger functions are not API endpoints. Definer RPCs owned by postgres may
-- reuse these helpers, but client roles cannot invoke a definer bypass directly.
revoke all on all functions in schema ledger_books_private from public, anon, authenticated;
alter default privileges in schema ledger_books_private revoke execute on functions from public;
