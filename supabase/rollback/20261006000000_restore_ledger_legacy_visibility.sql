-- #446 PR C rollback: restore the pre-book compatibility removed by
-- 20261006000000_remove_ledger_legacy_visibility.sql (contract #435).
-- NOT an automatic migration: run it by hand, only if an older app must come back.
-- Books and book_id are kept as they are; is_shared is rebuilt from each entry's
-- current book visibility, so later reclassifications stay respected. Apply this
-- BEFORE rolling the app back. Function bodies are the deployed definitions as of
-- 20261005120000 (taken from the migrated scratch DB with pg_get_functiondef).
--   PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/rollback/20261006000000_restore_ledger_legacy_visibility.sql
-- then: supabase migration repair --linked --status reverted 20261006000000
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.ledger_entries add column is_shared boolean;
-- Rebuilding a derived column is not a user write: skip the entry guard (it would
-- reject rows in archived books) and the reclassify-request expiry trigger.
alter table public.ledger_entries disable trigger ledger_entries_book_guard;
alter table public.ledger_entries disable trigger ledger_entries_expire_reclassify_requests;
update public.ledger_entries e set is_shared = (b.visibility = 'shared')
  from public.ledger_books b where b.id = e.book_id and b.household_id = e.household_id;
alter table public.ledger_entries enable trigger ledger_entries_book_guard;
alter table public.ledger_entries enable trigger ledger_entries_expire_reclassify_requests;
do $$
begin
  if exists (select 1 from public.ledger_entries where is_shared is null) then
    raise exception 'LEDGER_IS_SHARED_REBUILD_INCOMPLETE';
  end if;
end;
$$;
alter table public.ledger_entries alter column is_shared set default true;
alter table public.ledger_entries alter column is_shared set not null;

CREATE OR REPLACE FUNCTION ledger_books_private.resolve_legacy_book(p_household_id uuid, p_owner_id uuid, p_is_shared boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.resolve_historical_book(p_household_id uuid, p_owner_id uuid, p_is_shared boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

revoke all on function ledger_books_private.resolve_legacy_book(uuid, uuid, boolean) from public, anon, authenticated;

revoke all on function ledger_books_private.resolve_historical_book(uuid, uuid, boolean) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_ledger_entries(hh_id uuid, search_query text, search_scope text, result_offset integer DEFAULT 0, result_limit integer DEFAULT 21)
 RETURNS SETOF ledger_entries
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;

revoke execute on function public.search_ledger_entries(uuid, text, text, integer, integer)
  from public, anon;

grant execute on function public.search_ledger_entries(uuid, text, text, integer, integer)
  to authenticated;

CREATE OR REPLACE FUNCTION public.backfill_ledger_books(p_batch_size integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

revoke all on function public.backfill_ledger_books(integer) from public, anon, authenticated;

grant execute on function public.backfill_ledger_books(integer) to service_role;

CREATE OR REPLACE FUNCTION ledger_books_private.assert_entry_book(p_entry ledger_entries, p_require_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.assert_entry_relationships(p_entry ledger_entries, p_enforce_source_permissions boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.can_view_ledger_entry(p_user_id uuid, p_entry_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_user_id is not distinct from auth.uid() and exists (
    select 1 from public.ledger_entries e
    where e.id = p_entry_id
      and exists (select 1 from public.household_members hm
        where hm.household_id = e.household_id and hm.user_id = p_user_id)
      and (
        e.owner_id = p_user_id
        or (e.book_id is null and e.is_shared)
        or exists (select 1 from public.ledger_books b
          where b.id = e.book_id and b.household_id = e.household_id and b.visibility = 'shared')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.guard_book()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.guard_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION ledger_books_private.guard_entry_tag()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.write_ledger_entry(p_operation text, p_actor_id uuid, p_payload jsonb DEFAULT '{}'::jsonb, p_entry_id uuid DEFAULT NULL::uuid)
 RETURNS ledger_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old public.ledger_entries;
  v_new public.ledger_entries;
  v_book public.ledger_books;
  v_source_book public.ledger_books;
  v_source_book_id uuid;
  v_destination_book_id uuid;
  v_expected_updated_at timestamptz;
  v_confirm_visibility_change boolean := false;
  v_household_id uuid;
  v_book_id uuid;
  v_fields jsonb := '{}'::jsonb;
  v_key text;
  v_value jsonb;
  v_column text;
  v_names text[] := '{}';
  v_keys text[] := '{}';
  v_name text;
  -- ECMAScript String.trim whitespace, including NBSP and BOM used by legacy clients.
  v_trim_chars constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
  v_tag_id uuid;
  v_pm_ids uuid[];
  v_account_ids uuid[];
  v_pm public.payment_methods;
  v_account public.accounts;
  v_entry public.ledger_entries;
  v_effects jsonb := '[]'::jsonb;
  v_id uuid;
  v_sign integer;
  v_delta numeric;
  v_skip_financial boolean := false;
  v_constraint text;
begin
  if p_actor_id is null or (
    (auth.jwt()->>'role') is distinct from 'service_role'
    and auth.uid() is distinct from p_actor_id
  ) then
    raise exception 'AUTH_UNAUTHORIZED';
  end if;
  if p_operation is null or p_operation not in ('create', 'update', 'delete')
    or p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception 'LEDGER_VALIDATION_ERROR';
  end if;

  -- Whitelist fields at the RPC boundary; updates cannot reassign book/actor/household.
  for v_key, v_value in select key, value from pg_catalog.jsonb_each(p_payload) loop
    v_column := case v_key
      when 'type' then 'type' when 'amount' then 'amount'
      when 'transactedAt' then 'transacted_at' when 'title' then 'title'
      when 'categoryId' then 'category_id' when 'fromAccountId' then 'from_account_id'
      when 'fromPaymentMethodId' then 'from_payment_method_id'
      when 'toAccountId' then 'to_account_id'
      when 'toPaymentMethodId' then 'to_payment_method_id' when 'memo' then 'memo'
      else null end;
    if v_column is not null and p_operation <> 'delete' then
      if (v_key = 'amount' and pg_catalog.jsonb_typeof(v_value) <> 'number')
        or (v_key <> 'amount' and pg_catalog.jsonb_typeof(v_value) not in ('string', 'null')) then
        raise exception 'LEDGER_VALIDATION_ERROR';
      end if;
      v_fields := v_fields || pg_catalog.jsonb_build_object(v_column, v_value);
    elsif v_key = 'tags' and p_operation <> 'delete' then
      null;
    elsif v_key = 'bookId' and p_operation in ('create', 'update') then
      if pg_catalog.jsonb_typeof(v_value) <> 'string' then raise exception 'LEDGER_VALIDATION_ERROR'; end if;
    elsif v_key = 'expectedUpdatedAt' and p_operation in ('update', 'delete') then
      if pg_catalog.jsonb_typeof(v_value) <> 'string' then raise exception 'LEDGER_VALIDATION_ERROR'; end if;
      begin v_expected_updated_at := (v_value #>> '{}')::timestamptz;
      exception when others then raise exception 'LEDGER_VALIDATION_ERROR'; end;
    elsif v_key = 'confirmVisibilityChange' and p_operation = 'update' then
      if pg_catalog.jsonb_typeof(v_value) <> 'boolean' then raise exception 'LEDGER_VALIDATION_ERROR'; end if;
      v_confirm_visibility_change := (v_value #>> '{}')::boolean;
    elsif p_operation = 'create' and v_key in ('householdId', 'ownerId', 'isShared') then
      if pg_catalog.jsonb_typeof(v_value) <> (case when v_key = 'isShared' then 'boolean' else 'string' end) then
        raise exception 'LEDGER_VALIDATION_ERROR';
      end if;
    else
      raise exception 'LEDGER_VALIDATION_ERROR';
    end if;
  end loop;

  -- Same normalization as normalizeLedgerTagInputs: trim, strip one #, first casing wins.
  if p_payload ? 'tags' and p_payload->'tags' <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(p_payload->'tags') <> 'array' then
      raise exception 'LEDGER_TAG_INVALID_NAME';
    end if;
    for v_value in select value from pg_catalog.jsonb_array_elements(p_payload->'tags') loop
      if pg_catalog.jsonb_typeof(v_value) <> 'string' then
        raise exception 'LEDGER_TAG_INVALID_NAME';
      end if;
      v_name := pg_catalog.btrim(v_value #>> '{}', v_trim_chars);
      if pg_catalog.left(v_name, 1) = '#' then
        v_name := pg_catalog.btrim(pg_catalog.substr(v_name, 2), v_trim_chars);
      end if;
      if v_name = '' then continue; end if;
      if pg_catalog.char_length(v_name) > 15 or v_name !~ '^[0-9A-Za-z_가-힣]+$' then
        raise exception 'LEDGER_TAG_INVALID_NAME';
      end if;
      if not (pg_catalog.lower(v_name) = any(v_keys)) then
        v_names := pg_catalog.array_append(v_names, v_name);
        v_keys := pg_catalog.array_append(v_keys, pg_catalog.lower(v_name));
      end if;
    end loop;
    if pg_catalog.cardinality(v_names) > 5 then raise exception 'LEDGER_TAG_LIMIT_EXCEEDED'; end if;
  end if;

  if p_operation = 'create' then
    v_household_id := (p_payload->>'householdId')::uuid;
    if p_payload ? 'ownerId' and (p_payload->>'ownerId')::uuid is distinct from p_actor_id then
      raise exception 'LEDGER_FORBIDDEN';
    end if;
  else
    -- Read the lock keys only; authoritative entry checks follow the household/book locks.
    select * into v_old from public.ledger_entries where id = p_entry_id;
    if not found then raise exception 'LEDGER_NOT_FOUND'; end if;
    -- Definer reads must hide inaccessible IDs just as the legacy RLS read did.
    if not exists (select 1 from public.household_members
      where household_id = v_old.household_id and user_id = p_actor_id)
      or not (
        (v_old.book_id is null and (v_old.is_shared or v_old.owner_id = p_actor_id))
        or exists (select 1 from public.ledger_books b
          where b.id = v_old.book_id and b.household_id = v_old.household_id
            and (b.visibility = 'shared' or (b.created_by = p_actor_id and v_old.owner_id = p_actor_id)))
      ) then
      raise exception 'LEDGER_NOT_FOUND';
    end if;
    v_household_id := v_old.household_id;
    if v_old.owner_id <> p_actor_id then raise exception 'LEDGER_FORBIDDEN'; end if;
  end if;

  -- Lock order shared with book management: household -> book -> entry -> financial rows.
  perform ledger_books_private.lock_books(v_household_id, null);
  if not exists (select 1 from public.households where id = v_household_id) then
    raise exception 'LEDGER_BOOK_UNAVAILABLE';
  end if;
  perform 1 from public.household_members
    where household_id = v_household_id and user_id = p_actor_id for key share;
  if not found then raise exception 'LEDGER_FORBIDDEN'; end if;

  -- Re-read under the household/book locks before deriving source or destination.
  if p_operation <> 'create' then
    select * into v_old from public.ledger_entries where id = p_entry_id for update;
    if not found then raise exception 'LEDGER_NOT_FOUND'; end if;
    if v_old.owner_id <> p_actor_id or v_old.household_id <> v_household_id then
      raise exception 'LEDGER_FORBIDDEN';
    end if;
    if not (
      (v_old.book_id is null and (v_old.is_shared or v_old.owner_id = p_actor_id))
      or exists (select 1 from public.ledger_books b
        where b.id = v_old.book_id and b.household_id = v_old.household_id
          and (b.visibility = 'shared' or (b.created_by = p_actor_id and v_old.owner_id = p_actor_id)))
    ) then raise exception 'LEDGER_NOT_FOUND'; end if;
  end if;

  if p_operation = 'create' then
    if p_payload ? 'bookId' then
      begin v_destination_book_id := (p_payload->>'bookId')::uuid;
      exception when others then raise exception 'LEDGER_VALIDATION_ERROR'; end;
    else
      -- Compatibility resolver remains for existing clients without bookId.
      v_destination_book_id := ledger_books_private.resolve_legacy_book(
        v_household_id, p_actor_id, coalesce((p_payload->>'isShared')::boolean, true));
    end if;
  else
    if p_payload ? 'bookId' and not (p_payload ? 'expectedUpdatedAt') then
      raise exception 'ENTRY_VERSION_REQUIRED';
    end if;
    if p_payload ? 'expectedUpdatedAt' and v_expected_updated_at is null then
      raise exception 'LEDGER_VALIDATION_ERROR';
    end if;
    if v_old.book_id is null then
      v_source_book_id := ledger_books_private.resolve_historical_book(
        v_household_id, p_actor_id, v_old.is_shared);
    else
      v_source_book_id := v_old.book_id;
    end if;
    if p_operation = 'update' and p_payload ? 'bookId' then
      begin v_destination_book_id := (p_payload->>'bookId')::uuid;
      exception when others then raise exception 'LEDGER_VALIDATION_ERROR'; end;
    else
      v_destination_book_id := v_source_book_id;
    end if;
    if v_old.book_id is not null then
      v_source_book_id := v_old.book_id;
    end if;
  end if;

  -- lock_books has already locked every household book in UUID order before the entry row.
  if p_operation <> 'create' then
    select * into v_source_book from public.ledger_books where id = v_source_book_id;
    if not found or v_source_book.household_id <> v_household_id
      or (v_source_book.visibility = 'personal' and v_source_book.created_by is distinct from p_actor_id) then
      raise exception 'LEDGER_BOOK_UNAVAILABLE';
    end if;
    if v_source_book.archived_at is not null then raise exception 'LEDGER_BOOK_ARCHIVED'; end if;
    select * into v_book from public.ledger_books where id = v_destination_book_id;
  else
    select * into v_book from public.ledger_books where id = v_destination_book_id for update;
  end if;
  if not found or v_book.household_id <> v_household_id
    or (v_book.visibility = 'personal' and v_book.created_by is distinct from p_actor_id) then
    raise exception 'LEDGER_BOOK_UNAVAILABLE';
  end if;
  if v_book.archived_at is not null then raise exception 'LEDGER_BOOK_ARCHIVED'; end if;
  if p_operation <> 'create' and v_book.id <> v_source_book.id
    and p_operation = 'update' and v_expected_updated_at is null then
    raise exception 'ENTRY_VERSION_REQUIRED';
  end if;

  if p_operation <> 'create' then
    if p_operation in ('update', 'delete') and p_payload ? 'expectedUpdatedAt'
      and v_old.updated_at is distinct from v_expected_updated_at then
      raise exception 'ENTRY_CHANGED';
    end if;
    if p_operation = 'update' and v_source_book.id <> v_book.id
      and (v_source_book.visibility = 'shared') is distinct from (v_book.visibility = 'shared')
      and not v_confirm_visibility_change then
      raise exception 'VISIBILITY_CHANGE_CONFIRMATION_REQUIRED';
    end if;
    v_new := v_old;
  else
    v_new.id := pg_catalog.gen_random_uuid();
    v_new.household_id := v_household_id;
    v_new.owner_id := p_actor_id;
    v_new.created_at := pg_catalog.now();
  end if;
  v_new := pg_catalog.jsonb_populate_record(v_new, v_fields);
  v_new.book_id := v_book.id;
  v_new.is_shared := (v_book.visibility = 'shared');
  v_new.updated_at := case when p_operation = 'create' then pg_catalog.now() else pg_catalog.clock_timestamp() end;

  if p_operation = 'update' and v_old.type = 'transfer' then
    if pg_catalog.jsonb_populate_record(v_old, v_fields) is distinct from v_old then
      raise exception 'LEDGER_TRANSFER_EDIT_UNSUPPORTED';
    end if;
    -- Historical transfer tags remain editable even if financial-source ownership changed.
    v_skip_financial := true;
  end if;

  if p_operation = 'update' then
    v_skip_financial := row(v_new.type, v_new.amount, v_new.from_account_id,
      v_new.from_payment_method_id, v_new.to_account_id, v_new.to_payment_method_id)
      is not distinct from row(v_old.type, v_old.amount, v_old.from_account_id,
      v_old.from_payment_method_id, v_old.to_account_id, v_old.to_payment_method_id);
  end if;
  if p_operation <> 'delete' then
    if v_new.type is null or v_new.amount is null or v_new.amount <= 0
      or v_new.amount::text in ('NaN', 'Infinity', '-Infinity')
      or v_new.transacted_at is null or not pg_catalog.isfinite(v_new.transacted_at)
      or pg_catalog.char_length(v_new.title) > 100 or pg_catalog.char_length(v_new.memo) > 500 then
      raise exception 'LEDGER_VALIDATION_ERROR';
    end if;
    if not v_skip_financial and (
      (v_new.from_account_id is not null and v_new.from_payment_method_id is not null)
      or (v_new.to_account_id is not null and v_new.to_payment_method_id is not null)
      or (v_new.type in ('expense', 'non_expense_withdrawal')
          and (v_new.to_account_id is not null or v_new.to_payment_method_id is not null))
      or (v_new.type = 'income' and (v_new.from_account_id is not null or v_new.from_payment_method_id is not null))
      or (v_new.type in ('transfer', 'non_expense_withdrawal') and
          (v_new.category_id is not null or (v_new.from_account_id is null and v_new.from_payment_method_id is null)))
      or (v_new.type = 'transfer' and (v_new.to_account_id is null and v_new.to_payment_method_id is null))) then
      raise exception 'LEDGER_VALIDATION_ERROR';
    end if;
    if v_new.category_id is not null then
      perform 1 from public.categories where id = v_new.category_id and household_id = v_household_id
        and type::text = v_new.type::text for key share;
      if not found then raise exception 'LEDGER_VALIDATION_ERROR'; end if;
    end if;
  end if;

  select pg_catalog.array_agg(distinct id order by id) into v_pm_ids from (
      values (v_old.from_payment_method_id), (v_old.to_payment_method_id),
             (v_new.from_payment_method_id), (v_new.to_payment_method_id)
    ) as ids(id) where id is not null;
    -- Payment methods first, so linked accounts cannot change between discovery and locking.
    perform 1 from public.payment_methods where id = any(v_pm_ids) order by id for update;
    select pg_catalog.array_agg(distinct id order by id) into v_account_ids from (
      select id from (values (v_old.from_account_id), (v_old.to_account_id),
                             (v_new.from_account_id), (v_new.to_account_id)) as ids(id)
      union all
      select linked_account_id from public.payment_methods where id = any(v_pm_ids)
        and type = 'debit_card' and (v_old.type = 'expense' or v_new.type = 'expense')
    ) as ids where id is not null;
    perform 1 from public.accounts where id = any(v_account_ids) order by id for update;

    foreach v_id in array coalesce(v_pm_ids, '{}'::uuid[]) loop
      select * into v_pm from public.payment_methods where id = v_id;
      if not found or v_pm.household_id <> v_household_id then raise exception 'LEDGER_INVALID_TRANSFER_TARGET'; end if;
      if not v_skip_financial and (
        (v_old.type = 'transfer' and v_id in (v_old.from_payment_method_id, v_old.to_payment_method_id))
        or (v_new.type = 'transfer' and v_id in (v_new.from_payment_method_id, v_new.to_payment_method_id))) then
        if v_pm.type not in ('prepaid', 'gift_card', 'cash') then raise exception 'LEDGER_INVALID_TRANSFER_TARGET'; end if;
      end if;
    end loop;
    foreach v_id in array coalesce(v_account_ids, '{}'::uuid[]) loop
      select * into v_account from public.accounts where id = v_id;
      if not found or v_account.household_id <> v_household_id then raise exception 'LEDGER_INVALID_TRANSFER_TARGET'; end if;
    end loop;

  if not v_skip_financial then
    -- Compute old and new effects with each record's own type (debit-card reversal included).
    for v_sign in select pg_catalog.unnest(array[-1, 1]) loop
      if (v_sign = -1 and p_operation = 'create') or (v_sign = 1 and p_operation = 'delete') then continue; end if;
      v_entry := case when v_sign = -1 then v_old else v_new end;
      for v_key, v_id, v_delta in
        select target, id, delta * v_sign from (values
          ('account', v_entry.from_account_id, -v_entry.amount),
          ('payment_method', v_entry.from_payment_method_id, -v_entry.amount),
          ('account', v_entry.to_account_id, v_entry.amount),
          ('payment_method', v_entry.to_payment_method_id, v_entry.amount)
        ) as effects(target, id, delta) where id is not null and (
          (delta < 0 and v_entry.type in ('expense', 'non_expense_withdrawal', 'transfer'))
          or (delta > 0 and v_entry.type in ('income', 'transfer'))
        )
      loop
        if v_key = 'payment_method' then
          select * into v_pm from public.payment_methods where id = v_id;
          if v_pm.type in ('prepaid', 'gift_card', 'cash') then
            null;
          elsif v_entry.type = 'expense' and v_pm.type = 'debit_card' and v_pm.linked_account_id is not null then
            v_key := 'account';
            v_id := v_pm.linked_account_id;
          else
            continue;
          end if;
        end if;
        v_effects := v_effects || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'target', v_key, 'id', v_id, 'delta', v_delta
        ));
      end loop;
    end loop;

    -- Historical sources may lose usage permission: own deletion must still reverse safely.
    -- Linked debit accounts inherit the selected card's authority, with household checks above.
    if p_operation <> 'delete' and (
      p_operation = 'create'
      or row(v_old.from_account_id, v_old.from_payment_method_id, v_old.to_account_id, v_old.to_payment_method_id)
        is distinct from row(v_new.from_account_id, v_new.from_payment_method_id, v_new.to_account_id, v_new.to_payment_method_id)
      or exists (select 1 from pg_catalog.jsonb_to_recordset(v_effects) as e(target text, id uuid, delta numeric)
        group by target, id having sum(delta) <> 0)
    ) then
      if exists (select 1 from public.accounts a
        where a.id = any(array[v_new.from_account_id, v_new.to_account_id])
          and a.owner_id <> p_actor_id and not (v_new.is_shared and a.is_household_usable))
        or exists (select 1 from public.payment_methods pm
          where pm.id = any(array[v_new.from_payment_method_id, v_new.to_payment_method_id])
            and pm.owner_id <> p_actor_id and not (v_new.is_shared and pm.is_household_usable)) then
        raise exception 'LEDGER_FINANCIAL_SOURCE_FORBIDDEN';
      end if;
    end if;
  end if;

  -- Everything above is validated/locked. Any failure below rolls back every effect.
  if p_operation = 'create' then
    insert into public.ledger_entries (
      id, household_id, owner_id, book_id, type, amount, transacted_at, title, category_id,
      from_account_id, from_payment_method_id, to_account_id, to_payment_method_id,
      is_shared, memo, created_at, updated_at
    ) values (
      v_new.id, v_new.household_id, v_new.owner_id, v_new.book_id, v_new.type, v_new.amount,
      v_new.transacted_at, v_new.title, v_new.category_id, v_new.from_account_id,
      v_new.from_payment_method_id, v_new.to_account_id, v_new.to_payment_method_id,
      v_new.is_shared, v_new.memo, v_new.created_at, v_new.updated_at
    ) returning * into v_new;
  elsif p_operation = 'update' then
    update public.ledger_entries set
      book_id = v_new.book_id, type = v_new.type, amount = v_new.amount,
      transacted_at = v_new.transacted_at, title = v_new.title, category_id = v_new.category_id,
      from_account_id = v_new.from_account_id, from_payment_method_id = v_new.from_payment_method_id,
      to_account_id = v_new.to_account_id, to_payment_method_id = v_new.to_payment_method_id,
      is_shared = v_new.is_shared, memo = v_new.memo, updated_at = v_new.updated_at
    where id = p_entry_id returning * into v_new;
  else
    delete from public.ledger_entries where id = p_entry_id returning * into v_new;
  end if;

  for v_key, v_id, v_delta in
    select target, id, sum(delta) from pg_catalog.jsonb_to_recordset(v_effects)
      as effects(target text, id uuid, delta numeric) group by target, id having sum(delta) <> 0 order by target, id
  loop
    if v_key = 'account' then
      -- NULL account balance means untracked, never turn it into a tracked balance.
      update public.accounts set balance = balance + v_delta,
        balance_updated_at = pg_catalog.now(), updated_at = pg_catalog.now()
      where id = v_id and balance is not null;
    else
      update public.payment_methods set balance = coalesce(balance, 0) + v_delta,
        balance_updated_at = pg_catalog.now(), updated_at = pg_catalog.now() where id = v_id;
    end if;
  end loop;

  if p_operation = 'update' and v_old.book_id is distinct from v_new.book_id then
    update public.record_change_requests set status = 'expired', resolved_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
    where target_type = 'ledger_entry' and target_id = v_new.id and status = 'pending'
      and request_type in ('update', 'delete');
  end if;

  if p_operation <> 'delete' and p_payload ? 'tags' then
    delete from public.ledger_entry_tags where ledger_entry_id = v_new.id;
    foreach v_name in array v_names loop
      insert into public.ledger_tags (household_id, name, name_normalized, last_used_at)
        values (v_household_id, v_name, pg_catalog.lower(v_name), pg_catalog.now())
        on conflict (household_id, name_normalized) do update
          set name = excluded.name, last_used_at = excluded.last_used_at, updated_at = pg_catalog.now()
        returning id into v_tag_id;
      insert into public.ledger_entry_tags (ledger_entry_id, tag_id, household_id)
        values (v_new.id, v_tag_id, v_household_id);
    end loop;
  end if;
  return v_new;
exception
  when check_violation or insufficient_privilege or foreign_key_violation or unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if sqlerrm = 'BOOK_ARCHIVED' then raise exception 'LEDGER_BOOK_ARCHIVED';
    elsif sqlerrm in ('BOOK_UNAVAILABLE', 'HOUSEHOLD_UNAVAILABLE') then raise exception 'LEDGER_BOOK_UNAVAILABLE';
    elsif sqlerrm in ('BOOK_ACTION_FORBIDDEN', 'LEDGER_OWNER_NOT_MEMBER') then raise exception 'LEDGER_FORBIDDEN';
    elsif sqlerrm = 'LEDGER_FINANCIAL_SOURCE_FORBIDDEN' then raise exception 'LEDGER_FINANCIAL_SOURCE_FORBIDDEN';
    elsif sqlstate = '23505' and v_constraint in ('ledger_books_shared_name_key', 'ledger_books_personal_name_key') then raise exception 'LEDGER_BOOK_NAME_CONFLICT';
    else raise exception 'LEDGER_VALIDATION_ERROR';
    end if;
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
    or numeric_value_out_of_range or not_null_violation then
    raise exception 'LEDGER_VALIDATION_ERROR';
end;
$function$;

CREATE OR REPLACE FUNCTION public.write_ledger_entries_batch(p_actor_id uuid, p_household_id uuid, p_entries jsonb, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_entry jsonb;
  v_payload jsonb;
  v_canonical_entries jsonb := '[]'::jsonb;
  v_entries jsonb := '[]'::jsonb;
  v_receipt ledger_books_private.ledger_entry_batch_receipts;
  v_row public.ledger_entries;
  v_inserted_count bigint;
begin
  if p_actor_id is null or (
    (auth.jwt()->>'role') is distinct from 'service_role' and auth.uid() is distinct from p_actor_id
  ) then raise exception 'AUTH_UNAUTHORIZED'; end if;
  if p_household_id is null or p_entries is null or pg_catalog.jsonb_typeof(p_entries) <> 'array'
    or pg_catalog.jsonb_array_length(p_entries) < 1 or pg_catalog.jsonb_array_length(p_entries) > 20 then
    raise exception 'LEDGER_VALIDATION_ERROR';
  end if;
  if not exists (select 1 from public.household_members
    where household_id = p_household_id and user_id = p_actor_id) then
    raise exception 'LEDGER_FORBIDDEN';
  end if;

  -- Match the existing household -> sorted book -> entry -> financial row lock order.
  perform ledger_books_private.lock_books(p_household_id, null);
  perform 1 from public.household_members where household_id = p_household_id
    and user_id = p_actor_id for key share;
  if not found then raise exception 'LEDGER_FORBIDDEN'; end if;

  for v_entry in select value from pg_catalog.jsonb_array_elements(p_entries) loop
    if pg_catalog.jsonb_typeof(v_entry) <> 'object' then raise exception 'LEDGER_VALIDATION_ERROR'; end if;
    -- Authority and legacy visibility are server-owned when a concrete book was selected.
    v_payload := v_entry - 'actorId' - 'actor_id' - 'ownerId' - 'owner_id' - 'householdId' - 'household_id';
    if v_entry ? 'bookId' then v_payload := v_payload - 'isShared'; end if;
    v_payload := pg_catalog.jsonb_set(v_payload, '{householdId}', pg_catalog.to_jsonb(p_household_id), true);
    v_canonical_entries := v_canonical_entries || pg_catalog.jsonb_build_array(v_payload);
  end loop;

  if p_request_id is not null then
    insert into ledger_books_private.ledger_entry_batch_receipts(actor_id, request_id, household_id, payload)
    values (p_actor_id, p_request_id, p_household_id, v_canonical_entries)
    on conflict (actor_id, request_id) do nothing;
    get diagnostics v_inserted_count = row_count;
    select * into v_receipt from ledger_books_private.ledger_entry_batch_receipts
      where actor_id = p_actor_id and request_id = p_request_id for update;
    if not found then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    if v_receipt.household_id <> p_household_id or v_receipt.payload <> v_canonical_entries then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    if v_inserted_count = 0 then
      if v_receipt.result is null then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
      return pg_catalog.jsonb_build_object('entries', v_receipt.result->'entries', 'replayed', true);
    end if;
  end if;

  for v_payload in select value from pg_catalog.jsonb_array_elements(v_canonical_entries) loop
    select * into v_row from public.write_ledger_entry('create', p_actor_id, v_payload);
    v_entries := v_entries || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_row));
  end loop;

  if p_request_id is not null then
    update ledger_books_private.ledger_entry_batch_receipts set
      result = pg_catalog.jsonb_build_object('entries', v_entries),
      created_at = pg_catalog.clock_timestamp()
    where actor_id = p_actor_id and request_id = p_request_id;
  end if;
  return pg_catalog.jsonb_build_object('entries', v_entries, 'replayed', false);
end;
$function$;

drop policy ledger_entries_select on public.ledger_entries;
create policy ledger_entries_select on public.ledger_entries for select to authenticated
  using (public.is_household_member(household_id) and (
    owner_id = (select auth.uid())
    or
    (book_id is null and (is_shared or owner_id = (select auth.uid())))
    or exists (select 1 from public.ledger_books b where b.id = book_id and b.household_id = ledger_entries.household_id
      and (b.visibility = 'shared' or (b.created_by = (select auth.uid()) and owner_id = b.created_by)))
  ));
