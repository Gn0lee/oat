-- Focused regression coverage for public.mutate_ledger_book.
-- Run only against the isolated scratch DB:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_440_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-books-management.sql
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
  'legacy_a1','occupied','entry','account','payment','category','tag'
]) as keys(key);

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.fid(key), key || '@ledger-books-management.invalid', '{}'::jsonb
from unnest(array['a1','a2','b1','b2']) as users(key);
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, name)
select pg_temp.fid(key), key || '@ledger-books-management.invalid', key
from unnest(array['a1','a2','b1','b2']) as users(key);
insert into public.households (id, name) values
  (pg_temp.fid('h1'), 'Management household A'), (pg_temp.fid('h2'), 'Management household B');
insert into public.household_members (household_id, user_id, role) values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), 'owner'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), 'owner'),
  (pg_temp.fid('h2'), pg_temp.fid('b2'), 'member');
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

set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));

-- The RPC returns a row for rename/archive/reactivate and preserves book identity.
do $$
declare
  before_book public.ledger_books;
  changed public.ledger_books;
begin
  select * into before_book from public.ledger_books where id = pg_temp.fid('shared');
  select * into changed from public.mutate_ledger_book(pg_temp.fid('shared'), 'rename', '  Spring trip  ');
  perform pg_temp.ok(changed.id = before_book.id and changed.household_id = before_book.household_id
    and changed.visibility = before_book.visibility and changed.created_by = before_book.created_by
    and changed.is_default = before_book.is_default and changed.name = 'Spring trip'
    and changed.archived_at is null,
    'rename trims the name and preserves book identity and other fields');
  perform public.mutate_ledger_book(pg_temp.fid('shared'), 'archive');
  perform pg_temp.ok((select archived_at is not null and name = 'Spring trip'
    from public.ledger_books where id = pg_temp.fid('shared')), 'archive keeps the renamed book');
  perform public.mutate_ledger_book(pg_temp.fid('shared'), 'reactivate');
  perform pg_temp.ok((select archived_at is null and name = 'Spring trip'
    from public.ledger_books where id = pg_temp.fid('shared')), 'reactivate restores the same book');
  perform public.mutate_ledger_book(pg_temp.fid('shared'), 'reactivate');
  perform pg_temp.ok((select archived_at is null from public.ledger_books where id = pg_temp.fid('shared')),
    'reactivating an active book is idempotent');
end;
$$;

-- Any household member can rename/archive shared books; only the creator or owner deletes.
select pg_temp.actor(pg_temp.fid('a2'));
select (public.mutate_ledger_book(pg_temp.fid('shared'), 'rename', 'Renamed by member')).id;
select (public.mutate_ledger_book(pg_temp.fid('shared'), 'archive')).id;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('shared'), 'rename'), '23514', 'BOOK_ARCHIVED');
select (public.mutate_ledger_book(pg_temp.fid('shared'), 'reactivate')).id;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('shared'), 'delete'), '42501', 'BOOK_ACTION_FORBIDDEN');
select pg_temp.actor(pg_temp.fid('a1'));
select (public.mutate_ledger_book(pg_temp.fid('shared'), 'delete')).id;
select pg_temp.ok(not exists (select 1 from public.ledger_books where id = pg_temp.fid('shared')),
  'household owner can delete another member empty shared book');

-- Personal books stay creator-only even when another household member is the owner.
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L,%L)',
  pg_temp.fid('personal_a1'), 'rename', 'peer edit'), '42501', 'BOOK_UNAVAILABLE');
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('personal_a1'), 'delete'), '42501', 'BOOK_UNAVAILABLE');
select pg_temp.actor(pg_temp.fid('a1'));
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L,%L)',
  pg_temp.fid('personal_a2'), 'archive', null), '42501', 'BOOK_UNAVAILABLE');
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('missing'), 'delete'), '42501', 'BOOK_UNAVAILABLE');
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('default2'), 'delete'), '42501', 'BOOK_UNAVAILABLE');

-- Defaults can only be exchanged through the dedicated owner RPC.
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('default1'), 'archive'), '23514', 'BOOK_DEFAULT_REQUIRED');
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('default1'), 'delete'), '23514', 'BOOK_DEFAULT_REQUIRED');
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('default1'), 'delete'), '42501', 'BOOK_ACTION_FORBIDDEN');
select pg_temp.expect_book_error(format('select public.make_default_ledger_book(%L)',
  pg_temp.fid('occupied')), '42501', 'BOOK_ACTION_FORBIDDEN');
select pg_temp.actor(pg_temp.fid('a1'));
select (public.make_default_ledger_book(pg_temp.fid('occupied'))).id;
select pg_temp.ok((select count(*) = 1 and bool_and(id = pg_temp.fid('occupied'))
  from public.ledger_books where household_id = pg_temp.fid('h1') and is_default),
  'owner uses default RPC to exchange the active shared default');
select (public.make_default_ledger_book(pg_temp.fid('default1'))).id;

-- Personal and shared scopes are independent; shared names are unique by case
-- and remain reserved while archived.
select (public.mutate_ledger_book(pg_temp.fid('personal_a1'), 'rename', 'Occupied')).id;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L,%L)',
  pg_temp.fid('occupied'), 'rename', '  sHaReD duplicate TARGET  '), '23505', 'unique constraint');
select (public.mutate_ledger_book(pg_temp.fid('shared2'), 'archive')).id;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L,%L)',
  pg_temp.fid('occupied'), 'rename', 'Shared duplicate target'), '23505', 'unique constraint');

-- #446: the old-client personal '개인 생활비' is an ordinary personal book once the
-- legacy contract is gone; occupied books still reject delete.
select public.mutate_ledger_book(pg_temp.fid('legacy_a1'), 'rename', 'New legacy name');
do $$ begin
  if (select name from public.ledger_books where id = pg_temp.fid('legacy_a1')) <> 'New legacy name' then
    raise exception 'former legacy personal book must be renamable';
  end if;
end $$;
select public.mutate_ledger_book(pg_temp.fid('legacy_a1'), 'delete');
do $$ begin
  if exists (select 1 from public.ledger_books where id = pg_temp.fid('legacy_a1')) then
    raise exception 'empty former legacy personal book must be deletable';
  end if;
end $$;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('occupied'), 'delete'), '23503', 'BOOK_NOT_EMPTY');
select pg_temp.ok((select count(*) = 1 and bool_and(title = 'Keep me' and amount = 17.25
    and memo = 'Original memo' and owner_id = pg_temp.fid('a1')
    and category_id = pg_temp.fid('category') and from_account_id = pg_temp.fid('account')
    and from_payment_method_id = pg_temp.fid('payment'))
  from public.ledger_entries where id = pg_temp.fid('entry'))
  and (select count(*) = 1 from public.ledger_entry_tags where ledger_entry_id = pg_temp.fid('entry'))
  and (select balance = 500.00 from public.accounts where id = pg_temp.fid('account'))
  and (select balance = 75.00 from public.payment_methods where id = pg_temp.fid('payment')),
  'failed deletes preserve entry, tags, endpoints and financial balances');

-- Invalid requests have stable validation errors.
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L,%L)',
  pg_temp.fid('occupied'), 'rename', '   '), '22023', 'VALIDATION_ERROR');
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('occupied'), 'purge'), '22023', 'VALIDATION_ERROR');

reset role;
set local role anon;
select pg_temp.expect_book_error(format('select public.mutate_ledger_book(%L,%L)',
  pg_temp.fid('occupied'), 'archive'), '42501', 'permission denied for function mutate_ledger_book');
reset role;

set constraints all immediate;
rollback;
\echo ledger book management regression passed (all fixtures rolled back)
