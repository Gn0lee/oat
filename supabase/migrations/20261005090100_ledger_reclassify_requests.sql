-- Other-member shared-book reclassify requests (#444).
-- Requires 20261005090000_record_change_request_reclassify_type.sql to be committed first.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- A reclassify request carries exactly one destination book and targets a ledger entry.
alter table public.record_change_requests
  add constraint record_change_requests_reclassify_shape_check check (
    request_type <> 'reclassify' or (
      target_type = 'ledger_entry'
      and pg_catalog.jsonb_typeof(proposed_changes->'bookId') = 'string'
      and proposed_changes - 'bookId' = '{}'::jsonb
    )
  ) not valid;
alter table public.record_change_requests validate constraint record_change_requests_reclassify_shape_check;

-- Reclassify requests are created only by the RPC, which builds the snapshot server-side.
drop policy "Users can create own record change requests" on public.record_change_requests;
create policy "Users can create own record change requests"
  on public.record_change_requests for insert
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and request_type <> 'reclassify'
  );

-- Direct client updates may only resolve/cancel a pending request; the request content is immutable.
-- SECURITY INVOKER on purpose: inside definer RPCs current_user is the owner, not the client role.
create function ledger_books_private.guard_record_change_request()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if row(new.id, new.household_id, new.requester_id, new.target_owner_id, new.target_type, new.target_id,
      new.request_type, new.message, new.proposed_changes, new.target_snapshot, new.created_at)
    is distinct from row(old.id, old.household_id, old.requester_id, old.target_owner_id, old.target_type,
      old.target_id, old.request_type, old.message, old.proposed_changes, old.target_snapshot, old.created_at) then
    raise exception using errcode = '42501', message = 'REQUEST_IMMUTABLE';
  end if;
  if old.status <> 'pending' then
    raise exception using errcode = '23514', message = 'REQUEST_NOT_PENDING';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'cancelled' and old.requester_id = auth.uid() then
    return new;
  end if;
  if new.status in ('approved', 'rejected') and old.request_type <> 'reclassify'
    and old.target_owner_id = auth.uid() then
    return new;
  end if;
  raise exception using errcode = '42501', message = 'REQUEST_ACTION_FORBIDDEN';
end;
$$;
create trigger record_change_requests_guard before update on public.record_change_requests
  for each row execute function ledger_books_private.guard_record_change_request();

create function ledger_books_private.expire_reclassify_requests(p_where text, p_id uuid, p_household_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_where = 'entry' then
    update public.record_change_requests set status = 'expired',
      resolved_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
    where target_type = 'ledger_entry' and target_id = p_id
      and request_type = 'reclassify' and status = 'pending';
  elsif p_where = 'book' then
    update public.record_change_requests set status = 'expired',
      resolved_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
    where request_type = 'reclassify' and status = 'pending'
      and (proposed_changes->>'bookId' = p_id::text or target_snapshot->>'sourceBookId' = p_id::text);
  elsif p_where = 'member' then
    update public.record_change_requests set status = 'expired',
      resolved_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
    where request_type = 'reclassify' and status = 'pending' and household_id = p_household_id
      and (requester_id = p_id or target_owner_id = p_id);
  end if;
end;
$$;
revoke all on function ledger_books_private.expire_reclassify_requests(text, uuid, uuid) from public, anon, authenticated;

create function ledger_books_private.expire_reclassify_on_entry_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform ledger_books_private.expire_reclassify_requests('entry', old.id);
    return old;
  end if;
  if row(new.*) is distinct from row(old.*) then
    perform ledger_books_private.expire_reclassify_requests('entry', new.id);
  end if;
  return new;
end;
$$;
create trigger ledger_entries_expire_reclassify_requests after update or delete on public.ledger_entries
  for each row execute function ledger_books_private.expire_reclassify_on_entry_change();

create function ledger_books_private.expire_reclassify_on_book_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform ledger_books_private.expire_reclassify_requests('book', old.id);
    return old;
  end if;
  if old.archived_at is null and new.archived_at is not null then
    perform ledger_books_private.expire_reclassify_requests('book', new.id);
  end if;
  return new;
end;
$$;
create trigger ledger_books_expire_reclassify_requests after update or delete on public.ledger_books
  for each row execute function ledger_books_private.expire_reclassify_on_book_change();

create function ledger_books_private.expire_reclassify_on_member_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform ledger_books_private.expire_reclassify_requests('member', old.user_id, old.household_id);
  return old;
end;
$$;
create trigger household_members_expire_reclassify_requests after delete on public.household_members
  for each row execute function ledger_books_private.expire_reclassify_on_member_removal();

create function public.create_ledger_reclassify_request(
  p_entry_id uuid,
  p_book_id uuid,
  p_expected_entry_updated_at timestamptz,
  p_message text default null
)
returns public.record_change_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_entry public.ledger_entries;
  v_source public.ledger_books;
  v_destination public.ledger_books;
  v_category_name text;
  v_request public.record_change_requests;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_UNAUTHORIZED';
  end if;
  if p_entry_id is null or p_book_id is null or p_expected_entry_updated_at is null
    or pg_catalog.char_length(coalesce(p_message, '')) > 1000 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  -- Hide entries the requester cannot currently read, exactly like the RLS read path.
  select * into v_entry from public.ledger_entries where id = p_entry_id;
  if not found or not ledger_books_private.can_view_ledger_entry(v_actor, p_entry_id) then
    raise exception using errcode = '42501', message = 'REQUEST_TARGET_NOT_FOUND';
  end if;

  -- Lock order shared with entry writes and book management: household -> books -> entry -> request.
  perform ledger_books_private.lock_books(v_entry.household_id, null);
  perform 1 from public.household_members
    where household_id = v_entry.household_id and user_id = v_actor for key share;
  if not found then
    raise exception using errcode = '42501', message = 'REQUEST_TARGET_NOT_FOUND';
  end if;
  select * into v_entry from public.ledger_entries where id = p_entry_id for share;
  if not found or not ledger_books_private.can_view_ledger_entry(v_actor, p_entry_id) then
    raise exception using errcode = '42501', message = 'REQUEST_TARGET_NOT_FOUND';
  end if;
  if v_entry.owner_id = v_actor then
    raise exception using errcode = '22023', message = 'REQUEST_SELF_TARGET';
  end if;

  select * into v_source from public.ledger_books where id = v_entry.book_id;
  if not found or v_source.household_id <> v_entry.household_id or v_source.visibility <> 'shared' then
    raise exception using errcode = '42501', message = 'REQUEST_TARGET_NOT_FOUND';
  end if;
  if v_source.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;

  select * into v_destination from public.ledger_books where id = p_book_id;
  if not found or v_destination.household_id <> v_entry.household_id
    or (v_destination.visibility = 'personal' and v_destination.created_by is distinct from v_actor) then
    raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE';
  end if;
  if v_destination.visibility <> 'shared' or v_destination.id = v_source.id then
    raise exception using errcode = '22023', message = 'RECLASSIFY_DESTINATION_INVALID';
  end if;
  if v_destination.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  if v_entry.updated_at is distinct from p_expected_entry_updated_at then
    raise exception using errcode = '23514', message = 'ENTRY_CHANGED';
  end if;

  select case when p.name is null then c.name else p.name || ' > ' || c.name end into v_category_name
  from public.categories c left join public.categories p on p.id = c.parent_id
  where c.id = v_entry.category_id;

  begin
    insert into public.record_change_requests (
      household_id, requester_id, target_owner_id, target_type, target_id, request_type, status,
      message, proposed_changes, target_snapshot
    ) values (
      v_entry.household_id, v_actor, v_entry.owner_id, 'ledger_entry', v_entry.id, 'reclassify', 'pending',
      nullif(pg_catalog.btrim(p_message), ''),
      pg_catalog.jsonb_build_object('bookId', v_destination.id),
      pg_catalog.jsonb_build_object(
        'targetType', 'ledger_entry',
        'ownerName', coalesce((select name from public.profiles where id = v_entry.owner_id), '알 수 없음'),
        'transactedAt', v_entry.transacted_at,
        'title', v_entry.title,
        'amount', v_entry.amount,
        'type', v_entry.type,
        'categoryName', v_category_name,
        'isShared', true,
        'sourceBookId', v_source.id,
        'sourceBookName', v_source.name,
        'destinationBookId', v_destination.id,
        'destinationBookName', v_destination.name,
        'expectedEntryUpdatedAt', v_entry.updated_at
      )
    ) returning * into v_request;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'REQUEST_ALREADY_PENDING';
  end;
  return v_request;
end;
$$;
revoke all on function public.create_ledger_reclassify_request(uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.create_ledger_reclassify_request(uuid, uuid, timestamptz, text) to authenticated;

-- Resolves a pending reclassify request once. A stale approval is committed as `expired`
-- (returned, not raised) so the caller can report REQUEST_EXPIRED without rolling it back.
create function public.resolve_ledger_reclassify_request(
  p_request_id uuid,
  p_decision text,
  p_response_message text default null
)
returns public.record_change_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.record_change_requests;
  v_entry public.ledger_entries;
  v_source public.ledger_books;
  v_destination public.ledger_books;
  v_destination_id uuid;
  v_is_valid boolean;
  v_now timestamptz;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_UNAUTHORIZED';
  end if;
  if p_request_id is null or p_decision is null or p_decision not in ('approved', 'rejected')
    or pg_catalog.char_length(coalesce(p_response_message, '')) > 1000 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  select * into v_request from public.record_change_requests where id = p_request_id;
  if not found or v_request.request_type <> 'reclassify'
    or v_actor not in (v_request.requester_id, v_request.target_owner_id)
    or (v_actor <> v_request.target_owner_id
      and not ledger_books_private.can_view_ledger_entry(v_actor, v_request.target_id)) then
    raise exception using errcode = '42501', message = 'REQUEST_NOT_FOUND';
  end if;
  if v_actor <> v_request.target_owner_id then
    raise exception using errcode = '42501', message = 'REQUEST_FORBIDDEN';
  end if;

  perform ledger_books_private.lock_books(v_request.household_id, null);
  select * into v_request from public.record_change_requests where id = p_request_id for update;
  if not found then
    raise exception using errcode = '42501', message = 'REQUEST_NOT_FOUND';
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '23514', message = 'REQUEST_NOT_PENDING';
  end if;
  if not exists (select 1 from public.household_members
    where household_id = v_request.household_id and user_id = v_actor) then
    raise exception using errcode = '42501', message = 'REQUEST_FORBIDDEN';
  end if;

  v_now := pg_catalog.clock_timestamp();
  if p_decision = 'rejected' then
    update public.record_change_requests set status = 'rejected',
      response_message = nullif(pg_catalog.btrim(p_response_message), ''), resolved_at = v_now, updated_at = v_now
    where id = v_request.id returning * into v_request;
    return v_request;
  end if;

  v_destination_id := (v_request.proposed_changes->>'bookId')::uuid;
  select * into v_entry from public.ledger_entries where id = v_request.target_id for update;
  select * into v_source from public.ledger_books where id = v_entry.book_id;
  select * into v_destination from public.ledger_books where id = v_destination_id;
  v_is_valid := v_entry.id is not null
    and v_entry.owner_id = v_actor
    and v_entry.household_id = v_request.household_id
    and v_entry.updated_at = (v_request.target_snapshot->>'expectedEntryUpdatedAt')::timestamptz
    and v_entry.book_id::text = v_request.target_snapshot->>'sourceBookId'
    and exists (select 1 from public.household_members
      where household_id = v_request.household_id and user_id = v_request.requester_id)
    and v_source.id is not null and v_source.household_id = v_request.household_id
    and v_source.visibility = 'shared' and v_source.archived_at is null
    and v_destination.id is not null and v_destination.household_id = v_request.household_id
    and v_destination.visibility = 'shared' and v_destination.archived_at is null
    and v_destination.id <> v_source.id;

  if not coalesce(v_is_valid, false) then
    update public.record_change_requests set status = 'expired', resolved_at = v_now, updated_at = v_now
    where id = v_request.id returning * into v_request;
    return v_request;
  end if;

  -- Mark approved first so the entry write's expiry trigger only touches other pending requests.
  update public.record_change_requests set status = 'approved',
    response_message = nullif(pg_catalog.btrim(p_response_message), ''), resolved_at = v_now, updated_at = v_now
  where id = v_request.id returning * into v_request;
  perform public.write_ledger_entry('update', v_actor,
    pg_catalog.jsonb_build_object('bookId', v_destination.id, 'expectedUpdatedAt', v_entry.updated_at),
    v_entry.id);
  return v_request;
end;
$$;
revoke all on function public.resolve_ledger_reclassify_request(uuid, text, text) from public, anon;
grant execute on function public.resolve_ledger_reclassify_request(uuid, text, text) to authenticated;
