-- Focused regression coverage for public.write_ledger_entry and atomic batches.
-- Run only against the isolated scratch DB:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_442_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-book-entry-writes.sql
-- All fixtures roll back.

\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
begin
  if current_database() !~ '^oat_ledger_books_[0-9a-z_]+_test$' then
    raise exception 'Run only in an oat_ledger_books_*_test scratch DB (never the shared postgres DB)';
  end if;
  assert to_regprocedure('public.mutate_ledger_book(uuid,text,text)') is not null,
    'missing public.mutate_ledger_book';
  assert has_function_privilege('authenticated', 'public.mutate_ledger_book(uuid,text,text)', 'execute'),
    'authenticated must be able to execute book management';
  assert not has_function_privilege('anon', 'public.mutate_ledger_book(uuid,text,text)', 'execute'),
    'anon must not be able to execute book management';
  assert not has_function_privilege('public', 'public.mutate_ledger_book(uuid,text,text)', 'execute'),
    'PUBLIC must not be able to execute book management';
end;
$$;

create temporary table fixture_ids (key text primary key, id uuid not null);
grant select on fixture_ids to authenticated, anon;
create function pg_temp.fid(p_key text) returns uuid language sql stable as $$
  select id from pg_temp.fixture_ids where key = p_key;
$$;
create function pg_temp.ok(p_condition boolean, p_message text) returns void language plpgsql as $$
begin
  assert p_condition is true, p_message;
  raise notice 'ok: %', p_message;
end;
$$;
create function pg_temp.actor(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.expect_book_error(p_call text, p_state text, p_message text) returns void
language plpgsql as $$
declare
  got_state text;
  got_message text;
begin
  begin
    execute p_call;
  exception when others then
    get stacked diagnostics got_state = returned_sqlstate, got_message = message_text;
  end;
  assert got_state = p_state and position(p_message in coalesce(got_message, '')) > 0,
    p_message || ': expected ' || p_state || '/' || p_message || ', got ' ||
      coalesce(got_state, 'success') || '/' || coalesce(got_message, '');
  raise notice 'ok: %', p_message;
end;
$$;

insert into fixture_ids
select key, gen_random_uuid() from unnest(array[
  'h1','h2','a1','a2','b1','b2','missing','shared','shared2','personal_a1','personal_a2',
  'legacy_a1','occupied','entry','private_entry','pending_request','private_request','private_notification','private_author_notification','account','payment','category','tag'
]) as keys(key);

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.fid(key), key || '@ledger-book-entry-writes.invalid', '{}'::jsonb
from unnest(array['a1','a2','b1','b2']) as users(key);
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, name)
select pg_temp.fid(key), key || '@ledger-book-entry-writes.invalid', key
from unnest(array['a1','a2','b1','b2']) as users(key);
insert into public.households (id, name) values
  (pg_temp.fid('h1'), 'Entry writes household A'), (pg_temp.fid('h2'), 'Entry writes household B');
insert into public.household_members (household_id, user_id, role) values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), 'owner'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), 'owner'),
  (pg_temp.fid('h2'), pg_temp.fid('b2'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('a1'), 'member');
insert into fixture_ids select 'default1', id from public.ledger_books
where household_id = pg_temp.fid('h1') and is_default;
insert into fixture_ids select 'default2', id from public.ledger_books
where household_id = pg_temp.fid('h2') and is_default;
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('shared'), pg_temp.fid('h1'), 'Management shared', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('shared2'), pg_temp.fid('h1'), 'Shared duplicate target', 'shared', pg_temp.fid('a2')),
  (pg_temp.fid('personal_a1'), pg_temp.fid('h1'), 'Personal A1', 'personal', pg_temp.fid('a1')),
  (pg_temp.fid('personal_a2'), pg_temp.fid('h1'), 'Personal A2', 'personal', pg_temp.fid('a2')),
  (pg_temp.fid('legacy_a1'), pg_temp.fid('h1'), '개인 생활비', 'personal', pg_temp.fid('a1')),
  (pg_temp.fid('occupied'), pg_temp.fid('h1'), 'Occupied', 'shared', pg_temp.fid('a1'));

insert into public.accounts (id, household_id, owner_id, name, balance)
values (pg_temp.fid('account'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Preserved account', 500.00);
insert into public.payment_methods (id, household_id, owner_id, name, type, balance)
values (pg_temp.fid('payment'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Preserved cash', 'cash', 75.00);
insert into public.categories (id, household_id, name, type)
values (pg_temp.fid('category'), pg_temp.fid('h1'), 'Preserved category', 'expense');
insert into public.ledger_tags (id, household_id, name, name_normalized)
values (pg_temp.fid('tag'), pg_temp.fid('h1'), 'PreservedTag', 'preservedtag');
insert into public.ledger_entries
  (id, household_id, owner_id, book_id, type, amount, from_account_id, from_payment_method_id,
   category_id, title, memo, transacted_at)
values (pg_temp.fid('entry'), pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('occupied'),
  'expense', 17.25, pg_temp.fid('account'), pg_temp.fid('payment'), pg_temp.fid('category'),
  'Keep me', 'Original memo', '2026-09-04 09:00:00+00');
insert into public.ledger_entry_tags (ledger_entry_id, tag_id, household_id)
values (pg_temp.fid('entry'), pg_temp.fid('tag'), pg_temp.fid('h1'));
insert into public.ledger_entries
  (id, household_id, owner_id, book_id, type, amount, from_account_id, category_id, title,
   transacted_at)
values (pg_temp.fid('private_entry'), pg_temp.fid('h1'), pg_temp.fid('a1'),
  pg_temp.fid('shared'), 'expense', 9.00, pg_temp.fid('account'), pg_temp.fid('category'),
  'Private history target', '2026-09-03 09:00:00+00');
insert into public.record_change_requests (id, household_id, requester_id, target_owner_id,
  target_type, target_id, request_type, message, target_snapshot)
values (pg_temp.fid('pending_request'), pg_temp.fid('h1'), pg_temp.fid('a2'), pg_temp.fid('a1'),
  'ledger_entry', pg_temp.fid('private_entry'), 'update', 'historical request body',
  jsonb_build_object('title','Historical snapshot'));
insert into public.notifications (id, recipient_id, household_id, type, title, body, link_kind,
  link_params, source_type, source_id)
values (pg_temp.fid('private_notification'), pg_temp.fid('a2'), pg_temp.fid('h1'),
  'ledger_record_changed', 'historical title', 'historical body', 'record_change_request_detail',
  jsonb_build_object('requestId', pg_temp.fid('pending_request')), 'record_change_request',
  pg_temp.fid('pending_request'));
insert into public.notifications (id, recipient_id, household_id, type, title, body, link_kind,
  link_params, source_type, source_id)
values (pg_temp.fid('private_author_notification'), pg_temp.fid('a1'), pg_temp.fid('h1'),
  'ledger_record_changed', 'author history title', 'author history body', 'record_change_request_detail',
  jsonb_build_object('requestId', pg_temp.fid('pending_request')), 'record_change_request',
  pg_temp.fid('pending_request'));

set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));

-- Explicit destination, optimistic version and visibility confirmation contract.
do $$
declare
  created public.ledger_entries;
  moved public.ledger_entries;
  before_account numeric;
  before_payment numeric;
  original_updated_at timestamptz;
begin
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb)',
    'create', pg_temp.fid('a1'), jsonb_build_object('householdId', pg_temp.fid('h1'),
      'ownerId', pg_temp.fid('b1'), 'type', 'expense', 'amount', 1,
      'transactedAt', '2026-09-05T09:00:00Z', 'title', 'Spoofed actor')::text),
    'P0001', 'LEDGER_FORBIDDEN');
  select * into created from public.write_ledger_entry('create', pg_temp.fid('a1'),
    jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('shared'), 'type', 'expense', 'amount', 21.50,
      'transactedAt', '2026-09-05T09:00:00Z', 'title', 'Selected shared book',
      'categoryId', pg_temp.fid('category'), 'fromAccountId', pg_temp.fid('account'),
      'tags', jsonb_build_array('Keeptag')));
  perform pg_temp.ok(created.owner_id = pg_temp.fid('a1') and created.book_id = pg_temp.fid('shared'),
    'create uses the selected active shared book');
  original_updated_at := created.updated_at;
  select balance into before_account from public.accounts where id = pg_temp.fid('account');
  select balance into before_payment from public.payment_methods where id = pg_temp.fid('payment');

  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('personal_a1'), 'expectedUpdatedAt', original_updated_at)::text, created.id),
    'P0001', 'VISIBILITY_CHANGE_CONFIRMATION_REQUIRED');
  select * into moved from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('personal_a1'), 'expectedUpdatedAt', original_updated_at,
      'confirmVisibilityChange', true), created.id);
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared'))::text, created.id),
    'P0001', 'ENTRY_VERSION_REQUIRED');
  perform pg_temp.ok(moved.id = created.id and moved.book_id = pg_temp.fid('personal_a1')
    and moved.amount = created.amount and moved.owner_id = created.owner_id
    and moved.from_account_id = created.from_account_id and moved.transacted_at = created.transacted_at
    and (select balance = before_account from public.accounts where id = pg_temp.fid('account'))
    and (select balance = before_payment from public.payment_methods where id = pg_temp.fid('payment'))
    and exists (select 1 from public.ledger_entry_tags where ledger_entry_id = created.id),
    'book-only public-to-private move preserves identity, money, endpoints, balances and tags');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared'),
      'expectedUpdatedAt', original_updated_at, 'confirmVisibilityChange', true)::text, created.id),
    'P0001', 'ENTRY_CHANGED');
  select * into moved from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('shared'), 'expectedUpdatedAt', moved.updated_at,
      'confirmVisibilityChange', true), created.id);
  select * into moved from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('shared2'), 'expectedUpdatedAt', moved.updated_at), created.id);
  perform pg_temp.ok(moved.book_id = pg_temp.fid('shared2'),
    'shared-to-shared move does not need visibility confirmation');
  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'archive');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('personal_a1'),
      'expectedUpdatedAt', moved.updated_at)::text, created.id), 'P0001', 'BOOK_ARCHIVED');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared2'),
      'expectedUpdatedAt', moved.updated_at)::text, created.id), 'P0001', 'BOOK_ARCHIVED');
  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'reactivate');
end;
$$;

-- Return to shared only with confirmation; a shared-to-shared move needs none.
do $$
declare
  moved public.ledger_entries;
  original_updated_at timestamptz;
  transfer public.ledger_entries;
  before_balance numeric;
begin
  select updated_at into original_updated_at from public.ledger_entries where id = pg_temp.fid('entry');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared'))::text,
    pg_temp.fid('entry')), 'P0001', 'ENTRY_VERSION_REQUIRED');

  select * into moved from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('shared'), 'expectedUpdatedAt', original_updated_at,
      'confirmVisibilityChange', true), pg_temp.fid('entry'));
  select * into moved from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('shared2'), 'expectedUpdatedAt', moved.updated_at),
    pg_temp.fid('entry'));
  perform pg_temp.ok(moved.book_id = pg_temp.fid('shared2'),
    'shared-to-shared movement needs no visibility confirmation');

  select balance into before_balance from public.accounts where id = pg_temp.fid('account');
  select * into transfer from public.write_ledger_entry('create', pg_temp.fid('a1'),
    jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('shared'),
      'type','transfer', 'amount', 13, 'transactedAt','2026-09-07T09:00:00Z',
      'title','Transfer', 'fromAccountId',pg_temp.fid('account'), 'toAccountId',pg_temp.fid('account')));
  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'archive');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared2'),
      'expectedUpdatedAt', transfer.updated_at)::text, transfer.id), 'P0001', 'BOOK_ARCHIVED');
  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'reactivate');
  select * into transfer from public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('shared2'), 'expectedUpdatedAt', transfer.updated_at), transfer.id);
  perform pg_temp.ok(transfer.type = 'transfer' and transfer.from_account_id = pg_temp.fid('account')
    and transfer.to_account_id = pg_temp.fid('account')
    and (select balance = before_balance from public.accounts where id = pg_temp.fid('account')),
    'transfer book-only move retains endpoints and balances');

  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('personal_a2'),
      'expectedUpdatedAt', transfer.updated_at)::text, transfer.id), 'P0001', 'BOOK_UNAVAILABLE');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('default2'),
      'expectedUpdatedAt', transfer.updated_at)::text, transfer.id), 'P0001', 'BOOK_UNAVAILABLE');

  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'archive');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entry(%L,%L,%L::jsonb,%L)',
    'update', pg_temp.fid('a1'), jsonb_build_object('bookId', pg_temp.fid('shared2'),
      'expectedUpdatedAt', transfer.updated_at)::text, transfer.id), 'P0001', 'BOOK_ARCHIVED');
  perform public.mutate_ledger_book(pg_temp.fid('shared2'), 'reactivate');
end;
$$;

-- Batch uses one RPC transaction and receipts make a retry a no-op.
do $$
declare
  result jsonb;
  retry jsonb;
  before_count bigint;
  request_id uuid := gen_random_uuid();
  failed_request_id uuid := gen_random_uuid();
  failed_retry jsonb;
  account_balance numeric;
  entries jsonb;
begin
  select count(*) into before_count from public.ledger_entries where household_id = pg_temp.fid('h1');
  entries := jsonb_build_array(
    jsonb_build_object('bookId', pg_temp.fid('shared'), 'type', 'expense', 'amount', 3,
      'transactedAt', '2026-09-06T09:00:00Z', 'title', 'Batch one', 'categoryId', pg_temp.fid('category'),
      'fromAccountId', pg_temp.fid('account')),
    jsonb_build_object('bookId', pg_temp.fid('shared'), 'type', 'expense', 'amount', 5,
      'transactedAt', '2026-09-06T09:00:00Z', 'title', 'Batch two', 'categoryId', pg_temp.fid('category'),
      'fromAccountId', pg_temp.fid('account')));
  result := public.write_ledger_entries_batch(pg_temp.fid('a1'), pg_temp.fid('h1'), entries, request_id);
  retry := public.write_ledger_entries_batch(pg_temp.fid('a1'), pg_temp.fid('h1'), entries, request_id);
  perform pg_temp.ok(jsonb_array_length(result->'entries') = 2 and (retry->>'replayed')::boolean
    and result->'entries' = retry->'entries', 'same keyed batch returns stored result on retry');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entries_batch(%L,%L,%L::jsonb,%L)',
    pg_temp.fid('a1'), pg_temp.fid('h1'), (entries || jsonb_build_array(jsonb_build_object(
      'bookId', pg_temp.fid('shared'), 'type', 'expense', 'amount', 8,
      'transactedAt', '2026-09-06T09:00:00Z', 'title', 'Changed payload',
      'categoryId', pg_temp.fid('category'), 'fromAccountId', pg_temp.fid('account'))))::text,
    request_id), 'P0001', 'IDEMPOTENCY_CONFLICT');
  perform pg_temp.ok((select count(*) = before_count + 2 from public.ledger_entries
    where household_id = pg_temp.fid('h1')), 'batch retry creates no duplicate entries');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entries_batch(%L,%L,%L::jsonb,%L)',
    pg_temp.fid('a1'), pg_temp.fid('h2'), entries::text, request_id), 'P0001', 'IDEMPOTENCY_CONFLICT');
  perform pg_temp.actor(pg_temp.fid('a1'));
  select balance into account_balance from public.accounts where id = pg_temp.fid('account');
  perform pg_temp.expect_book_error(format('select public.write_ledger_entries_batch(%L,%L,%L::jsonb,%L)',
    pg_temp.fid('a1'), pg_temp.fid('h1'), jsonb_build_array(entries->0,
      jsonb_build_object('bookId', pg_temp.fid('shared'), 'type', 'expense', 'amount', -1,
        'transactedAt', '2026-09-06T09:00:00Z', 'title', 'Invalid second row',
        'categoryId', pg_temp.fid('category'), 'fromAccountId', pg_temp.fid('account')))::text,
    failed_request_id), 'P0001', 'LEDGER_VALIDATION_ERROR');
  perform pg_temp.ok((select count(*) = before_count + 2 from public.ledger_entries
    where household_id = pg_temp.fid('h1'))
    and (select balance = account_balance from public.accounts where id = pg_temp.fid('account')),
    'failed batch commits no first-row entry or balance delta');
  failed_retry := public.write_ledger_entries_batch(pg_temp.fid('a1'), pg_temp.fid('h1'), entries,
    failed_request_id);
  perform pg_temp.ok(jsonb_array_length(failed_retry->'entries') = 2
    and (failed_retry->>'replayed')::boolean is false,
    'failed batch stores no request receipt and its corrected retry can commit');
end;
$$;

-- Direct authenticated reads hide linked history from peers; target authors retain history.
do $$
begin
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('personal_a1'),
      'expectedUpdatedAt', (select updated_at from public.ledger_entries where id = pg_temp.fid('private_entry')),
      'confirmVisibilityChange', true), pg_temp.fid('private_entry'));
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.ok((select status::text = 'expired' and resolved_at is not null
    from public.record_change_requests where id = pg_temp.fid('pending_request')),
    'reclassification expires pending ledger requests');
  perform pg_temp.ok(exists (select 1 from public.notifications
    where id = pg_temp.fid('private_author_notification')),
    'record author retains linked notification history');
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.ok(not exists (select 1 from public.record_change_requests
    where id = pg_temp.fid('pending_request'))
    and not exists (select 1 from public.notifications where id = pg_temp.fid('private_notification')),
    'peer cannot read a request or notification linked to a now-private record');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.write_ledger_entry('delete', pg_temp.fid('a1'), '{}'::jsonb, pg_temp.fid('private_entry'));
  perform pg_temp.ok(exists (select 1 from public.record_change_requests
    where id = pg_temp.fid('pending_request'))
    and exists (select 1 from public.notifications where id = pg_temp.fid('private_author_notification')),
    'record author retains historical request and notification after target deletion');
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.ok(not exists (select 1 from public.record_change_requests
    where id = pg_temp.fid('pending_request'))
    and not exists (select 1 from public.notifications where id = pg_temp.fid('private_notification')),
    'peer cannot read linked history after target deletion');

end;
$$;

select pg_temp.expect_book_error(format('update public.ledger_entries set book_id = %L where id = %L',
  pg_temp.fid('personal_a1'), pg_temp.fid('private_entry')), '42501', 'permission denied');
reset role;
select pg_temp.ok(has_function_privilege('authenticated',
  'public.write_ledger_entry(text,uuid,jsonb,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.write_ledger_entry(text,uuid,jsonb,uuid)', 'execute'),
  'write RPC is authenticated-only');
select pg_temp.ok(has_function_privilege('authenticated',
  'public.write_ledger_entries_batch(uuid,uuid,jsonb,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.write_ledger_entries_batch(uuid,uuid,jsonb,uuid)', 'execute')
  and not has_function_privilege('public', 'public.write_ledger_entries_batch(uuid,uuid,jsonb,uuid)', 'execute'),
  'batch RPC is explicitly authenticated-only');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.ledger_entries', 'update'),
  'authenticated users cannot bypass versioned book writes with direct table updates');
set constraints all immediate;
rollback;
\echo ledger book entry writes regression passed (all fixtures rolled back)
