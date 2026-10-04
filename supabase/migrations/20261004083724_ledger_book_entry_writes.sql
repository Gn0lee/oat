-- Book-aware transactional writes and visibility-aware history policies.
create or replace function public.write_ledger_entry(
  p_operation text,
  p_actor_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_entry_id uuid default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.write_ledger_entry(text, uuid, jsonb, uuid) from public, anon;
grant execute on function public.write_ledger_entry(text, uuid, jsonb, uuid) to authenticated, service_role;


-- Private idempotency receipts are written in the same transaction as entries and balances.
create table ledger_books_private.ledger_entry_batch_receipts (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (actor_id, request_id),
  constraint ledger_entry_batch_receipts_payload_object check (pg_catalog.jsonb_typeof(payload) = 'array'),
  constraint ledger_entry_batch_receipts_result_object check (result is null or pg_catalog.jsonb_typeof(result) = 'object')
);
revoke all on ledger_books_private.ledger_entry_batch_receipts from public, anon, authenticated;

grant usage on schema ledger_books_private to authenticated;

create function public.write_ledger_entries_batch(
  p_actor_id uuid,
  p_household_id uuid,
  p_entries jsonb,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.write_ledger_entries_batch(uuid, uuid, jsonb, uuid) from public, anon;
grant execute on function public.write_ledger_entries_batch(uuid, uuid, jsonb, uuid) to authenticated, service_role;

-- The helper answers only current ledger visibility and never consults request snapshots.
create function ledger_books_private.can_view_ledger_entry(p_user_id uuid, p_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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
$$;

create function ledger_books_private.can_view_notification_ledger_target(
  p_user_id uuid,
  p_source_type text,
  p_source_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target_type public.record_change_request_target_type;
  v_target_id uuid;
  v_target_owner_id uuid;
  v_household_id uuid;
begin
  if p_user_id is distinct from auth.uid() then return false; end if;
  if p_source_type = 'ledger_entry' then
    return ledger_books_private.can_view_ledger_entry(p_user_id, p_source_id);
  elsif p_source_type = 'record_change_request' then
    select target_type, target_id, target_owner_id, household_id
      into v_target_type, v_target_id, v_target_owner_id, v_household_id
      from public.record_change_requests where id = p_source_id;
    if not found then return false; end if;
    if v_target_type = 'ledger_entry' then
      if ledger_books_private.can_view_ledger_entry(p_user_id, v_target_id) then return true; end if;
      return v_target_owner_id = p_user_id
        and not exists (select 1 from public.ledger_entries e where e.id = v_target_id)
        and exists (select 1 from public.household_members hm
          where hm.household_id = v_household_id and hm.user_id = p_user_id);
    end if;
    return true;
  end if;
  return true;
end;
$$;
revoke all on function ledger_books_private.can_view_ledger_entry(uuid, uuid) from public, anon;
revoke all on function ledger_books_private.can_view_notification_ledger_target(uuid, text, uuid) from public, anon;
grant execute on function ledger_books_private.can_view_ledger_entry(uuid, uuid) to authenticated;
grant execute on function ledger_books_private.can_view_notification_ledger_target(uuid, text, uuid) to authenticated;

-- Keep both request participants' non-ledger history, while validating actual target visibility for ledgers.
drop policy "Users can view own record change requests" on public.record_change_requests;
create policy record_change_requests_select_visible_target on public.record_change_requests for select to authenticated
  using (
    target_type <> 'ledger_entry' and (requester_id = (select auth.uid()) or target_owner_id = (select auth.uid()))
    or target_type = 'ledger_entry'
      and (requester_id = (select auth.uid()) or target_owner_id = (select auth.uid()))
      and (
        ledger_books_private.can_view_ledger_entry((select auth.uid()), target_id)
        or (target_owner_id = (select auth.uid())
          and not exists (select 1 from public.ledger_entries e where e.id = target_id)
          and exists (select 1 from public.household_members hm
            where hm.household_id = record_change_requests.household_id and hm.user_id = (select auth.uid())))
      )
  );

-- Ledger-linked notifications (direct or request result) must follow live book visibility.
drop policy "Users can view own notifications" on public.notifications;
drop policy "Users can mark own notifications as read" on public.notifications;
create policy notifications_select_visible_ledger_target on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and
    ledger_books_private.can_view_notification_ledger_target((select auth.uid()), source_type, source_id));
create policy notifications_update_visible_ledger_target on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()) and
    ledger_books_private.can_view_notification_ledger_target((select auth.uid()), source_type, source_id))
  with check (recipient_id = (select auth.uid()) and
    ledger_books_private.can_view_notification_ledger_target((select auth.uid()), source_type, source_id));

-- All authenticated ledger edits must pass the caller-bound RPC so book moves
-- cannot bypass confirmation, optimistic versions, request expiry, or balance logic.
revoke update on public.ledger_entries from authenticated;
