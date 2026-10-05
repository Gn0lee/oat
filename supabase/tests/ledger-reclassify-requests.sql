-- Regression coverage for other-member shared-book reclassify requests (#444).
-- Run only against the isolated scratch DB:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_444_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-reclassify-requests.sql
-- All fixtures roll back.

\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
begin
  if current_database() <> 'oat_ledger_books_444_test' then
    raise exception 'Run only in oat_ledger_books_444_test (never the shared postgres DB)';
  end if;
  assert to_regprocedure('public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)') is not null,
    'missing public.create_ledger_reclassify_request';
  assert to_regprocedure('public.resolve_ledger_reclassify_request(uuid,text,text)') is not null,
    'missing public.resolve_ledger_reclassify_request';
  assert has_function_privilege('authenticated',
    'public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)', 'execute'),
    'authenticated must be able to create reclassify requests';
  assert has_function_privilege('authenticated',
    'public.resolve_ledger_reclassify_request(uuid,text,text)', 'execute'),
    'authenticated must be able to resolve reclassify requests';
  assert not has_function_privilege('anon',
    'public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)', 'execute'),
    'anon must not create reclassify requests';
  assert not has_function_privilege('anon',
    'public.resolve_ledger_reclassify_request(uuid,text,text)', 'execute'),
    'anon must not resolve reclassify requests';
end;
$$;

create temporary table fixture_ids (key text primary key, id uuid not null);
grant select, insert, update on fixture_ids to authenticated, anon;
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
create function pg_temp.expect_error(p_call text, p_message text) returns void
language plpgsql as $$
declare
  got_message text;
begin
  begin
    execute p_call;
  exception when others then
    get stacked diagnostics got_message = message_text;
  end;
  assert position(p_message in coalesce(got_message, 'success')) > 0,
    p_message || ': got ' || coalesce(got_message, 'success');
  raise notice 'ok: rejects with %', p_message;
end;
$$;
create function pg_temp.request(p_entry text, p_book text, p_expected timestamptz default null)
returns public.record_change_requests language sql as $$
  select * from public.create_ledger_reclassify_request(pg_temp.fid(p_entry), pg_temp.fid(p_book),
    coalesce(p_expected, (select updated_at from public.ledger_entries where id = pg_temp.fid(p_entry))),
    'please move');
$$;
create function pg_temp.request_call(p_entry text, p_book text, p_expected timestamptz default null)
returns text language sql as $$
  select format('select public.create_ledger_reclassify_request(%L,%L,%L,%L)',
    pg_temp.fid(p_entry), pg_temp.fid(p_book),
    coalesce(p_expected, (select updated_at from public.ledger_entries where id = pg_temp.fid(p_entry))),
    'please move');
$$;
create function pg_temp.status(p_request uuid) returns text language sql as $$
  select status::text from public.record_change_requests where id = p_request;
$$;
create table pg_temp.requests (key text primary key, id uuid not null);
grant select, insert on pg_temp.requests to authenticated;
create function pg_temp.rid(p_key text) returns uuid language sql stable as $$
  select id from pg_temp.requests where key = p_key;
$$;

insert into fixture_ids
select key, gen_random_uuid() from unnest(array[
  'h1','h2','a1','a2','a3','b1','s1','s2','s3','s4','p_a1','p_a2',
  'e1','e_transfer','e_personal','e_delete','account','account2','category'
]) as keys(key);

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.fid(key), key || '@ledger-reclassify.invalid', '{}'::jsonb
from unnest(array['a1','a2','a3','b1']) as users(key);
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, name)
select pg_temp.fid(key), key || '@ledger-reclassify.invalid', key
from unnest(array['a1','a2','a3','b1']) as users(key);
insert into public.households (id, name) values
  (pg_temp.fid('h1'), 'Reclassify household A'), (pg_temp.fid('h2'), 'Reclassify household B');
insert into public.household_members (household_id, user_id, role) values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), 'owner'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), 'member'),
  (pg_temp.fid('h1'), pg_temp.fid('a3'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), 'owner');
insert into fixture_ids select 'default1', id from public.ledger_books
where household_id = pg_temp.fid('h1') and is_default;
insert into fixture_ids select 'default2', id from public.ledger_books
where household_id = pg_temp.fid('h2') and is_default;
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('s1'), pg_temp.fid('h1'), 'Travel', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('s2'), pg_temp.fid('h1'), 'Moving', 'shared', pg_temp.fid('a2')),
  (pg_temp.fid('s3'), pg_temp.fid('h1'), 'Wedding', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('s4'), pg_temp.fid('h1'), 'Empty shared', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('p_a1'), pg_temp.fid('h1'), 'A1 private', 'personal', pg_temp.fid('a1')),
  (pg_temp.fid('p_a2'), pg_temp.fid('h1'), 'A2 private', 'personal', pg_temp.fid('a2'));
insert into public.accounts (id, household_id, owner_id, name, balance) values
  (pg_temp.fid('account'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Main account', 1000.00),
  (pg_temp.fid('account2'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Savings', 200.00);
insert into public.categories (id, household_id, name, type)
values (pg_temp.fid('category'), pg_temp.fid('h1'), 'Food', 'expense');

set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
-- Author entries go through the public writer so balances and versions are real.
insert into fixture_ids
select 'e1_real', id from public.write_ledger_entry('create', pg_temp.fid('a1'),
  jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('s1'), 'type', 'expense',
    'amount', 40, 'transactedAt', '2026-10-01T09:00:00Z', 'title', 'Dinner',
    'categoryId', pg_temp.fid('category'), 'fromAccountId', pg_temp.fid('account')));
insert into fixture_ids
select 'e_transfer_real', id from public.write_ledger_entry('create', pg_temp.fid('a1'),
  jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('s1'), 'type', 'transfer',
    'amount', 100, 'transactedAt', '2026-10-02T09:00:00Z', 'title', 'Move savings',
    'fromAccountId', pg_temp.fid('account'), 'toAccountId', pg_temp.fid('account2')));
insert into fixture_ids
select 'e_personal_real', id from public.write_ledger_entry('create', pg_temp.fid('a1'),
  jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('p_a1'), 'type', 'expense',
    'amount', 5, 'transactedAt', '2026-10-03T09:00:00Z', 'title', 'Private coffee'));
insert into fixture_ids
select 'e_delete_real', id from public.write_ledger_entry('create', pg_temp.fid('a1'),
  jsonb_build_object('householdId', pg_temp.fid('h1'), 'bookId', pg_temp.fid('s1'), 'type', 'expense',
    'amount', 7, 'transactedAt', '2026-10-03T09:00:00Z', 'title', 'Soon deleted'));
update fixture_ids set id = (select id from fixture_ids where key = 'e1_real') where key = 'e1';
update fixture_ids set id = (select id from fixture_ids where key = 'e_transfer_real') where key = 'e_transfer';
update fixture_ids set id = (select id from fixture_ids where key = 'e_personal_real') where key = 'e_personal';
update fixture_ids set id = (select id from fixture_ids where key = 'e_delete_real') where key = 'e_delete';

-- Creation validation: only other members, only active shared -> other active shared.
do $$
declare
  created public.record_change_requests;
begin
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's2'), 'REQUEST_SELF_TARGET');

  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.expect_error(pg_temp.request_call('e_personal', 's2', '2026-01-01T00:00:00Z'), 'REQUEST_TARGET_NOT_FOUND');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 'p_a2'), 'RECLASSIFY_DESTINATION_INVALID');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 'p_a1'), 'BOOK_UNAVAILABLE');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 'default2'), 'BOOK_UNAVAILABLE');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's1'), 'RECLASSIFY_DESTINATION_INVALID');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's2', '2020-01-01T00:00:00Z'), 'ENTRY_CHANGED');
  perform pg_temp.expect_error(format('select public.create_ledger_reclassify_request(%L,%L,null,null)',
    pg_temp.fid('e1'), pg_temp.fid('s2')), 'VALIDATION_ERROR');
  perform pg_temp.expect_error(format('select public.create_ledger_reclassify_request(%L,%L,%L,%L)',
    pg_temp.fid('e1'), pg_temp.fid('s2'), (select updated_at from public.ledger_entries where id = pg_temp.fid('e1')),
    repeat('x', 1001)), 'VALIDATION_ERROR');

  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.mutate_ledger_book(pg_temp.fid('s3'), 'archive');
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's3'), 'BOOK_ARCHIVED');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.mutate_ledger_book(pg_temp.fid('s3'), 'reactivate');

  perform pg_temp.actor(pg_temp.fid('b1'));
  perform pg_temp.expect_error(pg_temp.request_call('e1', 'default2', '2026-01-01T00:00:00Z'), 'REQUEST_TARGET_NOT_FOUND');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's2');
  insert into pg_temp.requests values ('r1', created.id);
  perform pg_temp.ok(created.status = 'pending' and created.request_type = 'reclassify'
    and created.requester_id = pg_temp.fid('a2') and created.target_owner_id = pg_temp.fid('a1')
    and created.household_id = pg_temp.fid('h1') and created.message = 'please move'
    and created.proposed_changes = jsonb_build_object('bookId', pg_temp.fid('s2')),
    'creates a pending reclassify request with only {bookId}');
  perform pg_temp.ok(created.target_snapshot->>'targetType' = 'ledger_entry'
    and created.target_snapshot->>'title' = 'Dinner'
    and (created.target_snapshot->>'amount')::numeric = 40
    and created.target_snapshot->>'type' = 'expense'
    and created.target_snapshot->>'categoryName' = 'Food'
    and created.target_snapshot->>'ownerName' = 'a1'
    and (created.target_snapshot->>'sourceBookId')::uuid = pg_temp.fid('s1')
    and created.target_snapshot->>'sourceBookName' = 'Travel'
    and (created.target_snapshot->>'destinationBookId')::uuid = pg_temp.fid('s2')
    and created.target_snapshot->>'destinationBookName' = 'Moving'
    and (created.target_snapshot->>'expectedEntryUpdatedAt')::timestamptz
      = (select updated_at from public.ledger_entries where id = pg_temp.fid('e1')),
    'server builds the snapshot including both book names and the entry version');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's3'), 'REQUEST_ALREADY_PENDING');

  perform pg_temp.actor(pg_temp.fid('a3'));
  select * into created from pg_temp.request('e1', 's3');
  insert into pg_temp.requests values ('r_a3', created.id);
end;
$$;

-- Direct table writes cannot forge or alter reclassify requests.
do $$
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.expect_error(format(
    'insert into public.record_change_requests (household_id, requester_id, target_owner_id, target_type,
       target_id, request_type, proposed_changes) values (%L,%L,%L,%L,%L,%L,%L::jsonb)',
    pg_temp.fid('h1'), pg_temp.fid('a2'), pg_temp.fid('a1'), 'ledger_entry', pg_temp.fid('e_transfer'),
    'reclassify', jsonb_build_object('bookId', pg_temp.fid('s2'))), 'row-level security');
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set proposed_changes = %L::jsonb where id = %L',
    jsonb_build_object('bookId', pg_temp.fid('s3')), pg_temp.rid('r1')), 'REQUEST_IMMUTABLE');
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set target_snapshot = %L::jsonb where id = %L',
    '{}', pg_temp.rid('r1')), 'REQUEST_IMMUTABLE');
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set status = %L where id = %L', 'approved', pg_temp.rid('r1')),
    'REQUEST_ACTION_FORBIDDEN');

  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set status = %L where id = %L', 'approved', pg_temp.rid('r1')),
    'REQUEST_ACTION_FORBIDDEN');
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set status = %L where id = %L', 'cancelled', pg_temp.rid('r1')),
    'REQUEST_ACTION_FORBIDDEN');
  perform pg_temp.ok(pg_temp.status(pg_temp.rid('r1')) = 'pending', 'request stays pending after blocked writes');
end;
$$;

-- Approval moves only book_id and expires competing pending reclassify requests.
do $$
declare
  resolved public.record_change_requests;
  before_entry public.ledger_entries;
  after_entry public.ledger_entries;
  before_balance numeric;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    pg_temp.rid('r1'), 'approved'), 'REQUEST_FORBIDDEN');

  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    pg_temp.rid('r1'), 'maybe'), 'VALIDATION_ERROR');
  select * into before_entry from public.ledger_entries where id = pg_temp.fid('e1');
  select balance into before_balance from public.accounts where id = pg_temp.fid('account');
  select * into resolved from public.resolve_ledger_reclassify_request(pg_temp.rid('r1'), 'approved', 'ok');
  select * into after_entry from public.ledger_entries where id = pg_temp.fid('e1');
  perform pg_temp.ok(resolved.status = 'approved' and resolved.resolved_at is not null
    and resolved.response_message = 'ok', 'author approval transitions pending -> approved');
  perform pg_temp.ok(after_entry.book_id = pg_temp.fid('s2') and after_entry.is_shared
    and after_entry.id = before_entry.id and after_entry.owner_id = before_entry.owner_id
    and after_entry.amount = before_entry.amount and after_entry.from_account_id = before_entry.from_account_id
    and after_entry.transacted_at = before_entry.transacted_at and after_entry.title = before_entry.title
    and after_entry.updated_at > before_entry.updated_at
    and (select balance from public.accounts where id = pg_temp.fid('account')) = before_balance,
    'approval moves only the book and keeps identity, money, endpoints and balance');
  perform pg_temp.ok(pg_temp.status(pg_temp.rid('r_a3')) = 'expired',
    'other pending reclassify requests on the moved entry expire');
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    pg_temp.rid('r1'), 'approved'), 'REQUEST_NOT_PENDING');
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    pg_temp.rid('r1'), 'rejected'), 'REQUEST_NOT_PENDING');

  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.expect_error(format(
    'update public.record_change_requests set status = %L where id = %L', 'cancelled', pg_temp.rid('r1')),
    'REQUEST_NOT_PENDING');
  perform pg_temp.ok(pg_temp.status(pg_temp.rid('r1')) = 'approved', 'cancel cannot overwrite an approval');
end;
$$;

-- Reject and requester cancel keep the entry untouched; a new request is possible afterwards.
do $$
declare
  created public.record_change_requests;
  resolved public.record_change_requests;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  perform pg_temp.actor(pg_temp.fid('a1'));
  select * into resolved from public.resolve_ledger_reclassify_request(created.id, 'rejected', 'no');
  perform pg_temp.ok(resolved.status = 'rejected'
    and (select book_id from public.ledger_entries where id = pg_temp.fid('e1')) = pg_temp.fid('s2'),
    'rejection keeps the entry in its book');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  update public.record_change_requests set status = 'cancelled', resolved_at = now(), updated_at = now()
    where id = created.id and status = 'pending';
  perform pg_temp.ok(pg_temp.status(created.id) = 'cancelled', 'requester cancels a pending request');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    created.id, 'approved'), 'REQUEST_NOT_PENDING');
end;
$$;

-- Entry edits/deletes and source/destination book archive/delete expire pending requests.
do $$
declare
  created public.record_change_requests;
  entry public.ledger_entries;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  perform pg_temp.actor(pg_temp.fid('a1'));
  select * into entry from public.ledger_entries where id = pg_temp.fid('e1');
  perform public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('memo', 'edited', 'expectedUpdatedAt', entry.updated_at), entry.id);
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'author edit expires the pending request');
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    created.id, 'approved'), 'REQUEST_NOT_PENDING');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's3');
  perform pg_temp.ok(created.status = 'pending', 'a new request is possible after expiry');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.mutate_ledger_book(pg_temp.fid('s3'), 'archive');
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'archiving the destination expires the request');
  perform public.mutate_ledger_book(pg_temp.fid('s3'), 'reactivate');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform public.mutate_ledger_book(pg_temp.fid('s2'), 'archive');
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'archiving the source expires the request');
  perform public.mutate_ledger_book(pg_temp.fid('s2'), 'reactivate');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's4');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.mutate_ledger_book(pg_temp.fid('s4'), 'delete');
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'deleting the empty destination expires the request');

  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e_delete', 's2');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform public.write_ledger_entry('delete', pg_temp.fid('a1'), '{}'::jsonb, pg_temp.fid('e_delete'));
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'deleting the entry expires the request');
end;
$$;

-- Approval re-validates even if a pending request survived a state change (defense in depth).
do $$
declare
  created public.record_change_requests;
  resolved public.record_change_requests;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  reset role;
  alter table public.ledger_entries disable trigger ledger_entries_expire_reclassify_requests;
  update public.ledger_entries set memo = 'silently changed', updated_at = clock_timestamp()
    where id = pg_temp.fid('e1');
  alter table public.ledger_entries enable trigger ledger_entries_expire_reclassify_requests;
  set local role authenticated;
  perform pg_temp.ok(pg_temp.status(created.id) = 'pending', 'fixture keeps the stale request pending');
  perform pg_temp.actor(pg_temp.fid('a1'));
  select * into resolved from public.resolve_ledger_reclassify_request(created.id, 'approved', null);
  perform pg_temp.ok(resolved.status = 'expired'
    and (select book_id from public.ledger_entries where id = pg_temp.fid('e1')) = pg_temp.fid('s2'),
    'stale approval expires the request without moving the entry');
end;
$$;

-- Transfers can be reclassified by request; amounts and balances stay.
do $$
declare
  created public.record_change_requests;
  resolved public.record_change_requests;
  before_main numeric;
  before_savings numeric;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e_transfer', 's2');
  perform pg_temp.actor(pg_temp.fid('a1'));
  select balance into before_main from public.accounts where id = pg_temp.fid('account');
  select balance into before_savings from public.accounts where id = pg_temp.fid('account2');
  select * into resolved from public.resolve_ledger_reclassify_request(created.id, 'approved', null);
  perform pg_temp.ok(resolved.status = 'approved'
    and (select book_id = pg_temp.fid('s2') and amount = 100 and type = 'transfer'
      and from_account_id = pg_temp.fid('account') and to_account_id = pg_temp.fid('account2')
      from public.ledger_entries where id = pg_temp.fid('e_transfer'))
    and (select balance from public.accounts where id = pg_temp.fid('account')) = before_main
    and (select balance from public.accounts where id = pg_temp.fid('account2')) = before_savings,
    'transfer approval moves only the book');
end;
$$;

-- Membership loss expires requests; requester left before approval cannot get approved.
do $$
declare
  created public.record_change_requests;
begin
  perform pg_temp.actor(pg_temp.fid('a3'));
  select * into created from pg_temp.request('e_transfer', 's1');
  reset role;
  delete from public.household_members where household_id = pg_temp.fid('h1') and user_id = pg_temp.fid('a3');
  set local role authenticated;
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'requester leaving the household expires the request');
end;
$$;

-- Shared -> personal move hides request history and notifications from non-authors.
do $$
declare
  created public.record_change_requests;
  entry public.ledger_entries;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  select * into created from pg_temp.request('e1', 's1');
  insert into pg_temp.requests values ('r_private', created.id);
  reset role;
  insert into public.notifications (recipient_id, household_id, type, title, body, link_kind,
    link_params, source_type, source_id)
  values (pg_temp.fid('a2'), pg_temp.fid('h1'), 'ledger_request_result', 'Dinner moved?', 'body',
    'record_change_request_detail', jsonb_build_object('requestId', created.id),
    'record_change_request', created.id);
  set local role authenticated;
  perform pg_temp.actor(pg_temp.fid('a1'));
  select * into entry from public.ledger_entries where id = pg_temp.fid('e1');
  perform public.write_ledger_entry('update', pg_temp.fid('a1'),
    jsonb_build_object('bookId', pg_temp.fid('p_a1'), 'expectedUpdatedAt', entry.updated_at,
      'confirmVisibilityChange', true), entry.id);
  perform pg_temp.ok(pg_temp.status(created.id) = 'expired', 'author move to personal expires the request');
  perform pg_temp.actor(pg_temp.fid('a2'));
  perform pg_temp.ok(not exists (select 1 from public.record_change_requests where id = pg_temp.rid('r_private'))
    and not exists (select 1 from public.notifications where source_id = pg_temp.rid('r_private')),
    'non-author can no longer read the request snapshot or its notification');
  perform pg_temp.expect_error(pg_temp.request_call('e1', 's2', '2026-01-01T00:00:00Z'), 'REQUEST_TARGET_NOT_FOUND');
  perform pg_temp.expect_error(format('select public.resolve_ledger_reclassify_request(%L,%L,null)',
    pg_temp.rid('r_private'), 'approved'), 'REQUEST_NOT_FOUND');
  perform pg_temp.actor(pg_temp.fid('a1'));
  perform pg_temp.ok(exists (select 1 from public.record_change_requests where id = pg_temp.rid('r_private')),
    'author still sees their own request history');
end;
$$;

-- Existing update/delete requests keep working for the target owner.
do $$
declare
  legacy_id uuid;
begin
  perform pg_temp.actor(pg_temp.fid('a2'));
  insert into public.record_change_requests (household_id, requester_id, target_owner_id, target_type,
    target_id, request_type, proposed_changes, target_snapshot)
  values (pg_temp.fid('h1'), pg_temp.fid('a2'), pg_temp.fid('a1'), 'ledger_entry', pg_temp.fid('e_transfer'),
    'delete', '{}'::jsonb, '{}'::jsonb)
  returning id into legacy_id;
  perform pg_temp.actor(pg_temp.fid('a1'));
  update public.record_change_requests set status = 'rejected', resolved_at = now(), updated_at = now()
    where id = legacy_id and status = 'pending';
  perform pg_temp.ok(pg_temp.status(legacy_id) = 'rejected', 'legacy delete request can still be rejected');
end;
$$;

rollback;
