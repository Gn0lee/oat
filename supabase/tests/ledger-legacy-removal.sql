-- #446 PR C: contract after 20261006000000_remove_ledger_legacy_visibility.sql.
-- Scratch only; every fixture rolls back.
--   docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_446c_test \
--     -v ON_ERROR_STOP=1 < supabase/tests/ledger-legacy-removal.sql
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
  assert not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ledger_entries' and column_name = 'is_shared'),
    'ledger_entries.is_shared is dropped';
  assert to_regprocedure('public.search_ledger_entries(uuid,text,text,integer,integer)') is null,
    'legacy search RPC is dropped';
  assert to_regprocedure('public.backfill_ledger_books(integer)') is null, 'backfill helper is dropped';
  assert to_regprocedure('ledger_books_private.resolve_legacy_book(uuid,uuid,boolean)') is null,
    'legacy book resolver is dropped';
  assert to_regprocedure('ledger_books_private.resolve_historical_book(uuid,uuid,boolean)') is null,
    'historical book resolver is dropped';
  assert not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'ledger_books_private') and p.prosrc ilike '%is_shared%'),
    'no function body references is_shared';
  assert to_regprocedure('public.search_ledger_entries_scoped(uuid,text,uuid,timestamptz,timestamptz,uuid,integer)') is not null,
    'scoped search stays';
end;
$$;

create temporary table ids as select key, gen_random_uuid() id from unnest(array[
  'me', 'partner', 'h', 'personal', 'shared2', 'my_account', 'partner_usable', 'partner_private'
]) keys(key);
grant select on ids to authenticated;
create function pg_temp.id(k text) returns uuid language sql stable as $$ select id from ids where key = k $$;
create function pg_temp.actor(k text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.id(k)::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.id(k), 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.rejects(sql text, expected text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    assert sqlerrm like '%' || expected || '%', format('expected %s, got %s', expected, sqlerrm);
    raise notice 'ok: %', expected;
    return;
  end;
  raise exception 'unexpected success: %', sql;
end $$;

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id, email) select id, key || '@446-removal.invalid' from ids where key in ('me', 'partner');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id, email, name) select id, key || '@446-removal.invalid', key from ids where key in ('me', 'partner');
insert into public.households(id, name) values (pg_temp.id('h'), '446 removal');
insert into public.household_members(household_id, user_id, role)
values (pg_temp.id('h'), pg_temp.id('me'), 'owner'), (pg_temp.id('h'), pg_temp.id('partner'), 'member');
insert into ids select 'shared', id from public.ledger_books where household_id = pg_temp.id('h') and is_default;
insert into public.ledger_books(id, household_id, name, visibility, created_by) values
  (pg_temp.id('personal'), pg_temp.id('h'), '개인 생활비', 'personal', pg_temp.id('me')),
  (pg_temp.id('shared2'), pg_temp.id('h'), '여행', 'shared', pg_temp.id('me'));
insert into public.accounts(id, household_id, owner_id, name, balance, is_household_usable) values
  (pg_temp.id('my_account'), pg_temp.id('h'), pg_temp.id('me'), 'mine', 100, false),
  (pg_temp.id('partner_usable'), pg_temp.id('h'), pg_temp.id('partner'), 'usable', 100, true),
  (pg_temp.id('partner_private'), pg_temp.id('h'), pg_temp.id('partner'), 'private', 100, false);

set local role authenticated;
select pg_temp.actor('me');
do $$
declare
  shared_entry public.ledger_entries;
  personal_entry public.ledger_entries;
  base jsonb := jsonb_build_object('householdId', pg_temp.id('h'), 'type', 'expense', 'amount', 10,
    'transactedAt', '2026-10-05T00:00:00Z', 'title', 'removal');
begin
  -- Pre-book clients: no book, or the old isShared flag, are rejected.
  perform pg_temp.rejects(format('select public.write_ledger_entry(%L,%L,%L)', 'create', pg_temp.id('me'), base),
    'LEDGER_VALIDATION_ERROR');
  perform pg_temp.rejects(format('select public.write_ledger_entry(%L,%L,%L)', 'create', pg_temp.id('me'),
    base || jsonb_build_object('bookId', pg_temp.id('shared'), 'isShared', true)), 'LEDGER_VALIDATION_ERROR');
  perform pg_temp.rejects(format('select public.write_ledger_entries_batch(%L,%L,%L)', pg_temp.id('me'),
    pg_temp.id('h'), jsonb_build_array(base - 'householdId')), 'LEDGER_VALIDATION_ERROR');
  perform pg_temp.rejects(format(
    'insert into public.ledger_entries(household_id, owner_id, type, amount, transacted_at) values (%L,%L,%L,1,now())',
    pg_temp.id('h'), pg_temp.id('me'), 'expense'), 'BOOK_UNAVAILABLE');

  -- Book-named creates keep visibility in the book only.
  select * into shared_entry from public.write_ledger_entry('create', pg_temp.id('me'),
    base || jsonb_build_object('bookId', pg_temp.id('shared'), 'fromAccountId', pg_temp.id('partner_usable')));
  assert shared_entry.book_id = pg_temp.id('shared'), 'shared create keeps the selected book';
  select * into personal_entry from public.write_ledger_entry('create', pg_temp.id('me'),
    base || jsonb_build_object('bookId', pg_temp.id('personal'), 'fromAccountId', pg_temp.id('my_account')));
  assert personal_entry.book_id = pg_temp.id('personal'), 'personal create keeps the selected book';

  -- Household-usable sources follow the book visibility (was is_shared).
  perform pg_temp.rejects(format('select public.write_ledger_entry(%L,%L,%L)', 'create', pg_temp.id('me'),
    base || jsonb_build_object('bookId', pg_temp.id('personal'), 'fromAccountId', pg_temp.id('partner_usable'))),
    'LEDGER_FINANCIAL_SOURCE_FORBIDDEN');
  perform pg_temp.rejects(format('select public.write_ledger_entry(%L,%L,%L)', 'create', pg_temp.id('me'),
    base || jsonb_build_object('bookId', pg_temp.id('shared'), 'fromAccountId', pg_temp.id('partner_private'))),
    'LEDGER_FINANCIAL_SOURCE_FORBIDDEN');

  -- Reclassify and archive still work on book_id alone.
  personal_entry := public.write_ledger_entry('update', pg_temp.id('me'),
    jsonb_build_object('bookId', pg_temp.id('shared2'), 'expectedUpdatedAt', personal_entry.updated_at,
      'confirmVisibilityChange', true), personal_entry.id);
  assert personal_entry.book_id = pg_temp.id('shared2'), 'personal -> shared move';

  perform set_config('test.shared_entry', shared_entry.id::text, true);
  perform set_config('test.moved_entry', personal_entry.id::text, true);
end;
$$;

-- RLS reads by book visibility: the partner sees shared books, never my personal book.
select pg_temp.actor('partner');
do $$
begin
  assert exists (select 1 from public.ledger_entries where id = current_setting('test.shared_entry')::uuid),
    'partner sees a shared-book entry';
  assert exists (select 1 from public.ledger_entries where id = current_setting('test.moved_entry')::uuid),
    'partner sees an entry moved into a shared book';
  assert not exists (select 1 from public.ledger_entries where book_id = pg_temp.id('personal')),
    'partner never sees personal-book entries';
  assert not exists (select 1 from public.ledger_books where id = pg_temp.id('personal')),
    'partner never sees the personal book';
  assert ledger_books_private.can_view_ledger_entry(pg_temp.id('partner'), current_setting('test.shared_entry')::uuid),
    'visibility helper follows the book';
end;
$$;

-- The former legacy personal book is an ordinary personal book now.
select pg_temp.actor('me');
select public.mutate_ledger_book(pg_temp.id('personal'), 'rename', '내 용돈');
do $$
begin
  assert (select name from public.ledger_books where id = pg_temp.id('personal')) = '내 용돈',
    'former legacy personal book can be renamed';
end;
$$;

rollback;
\echo 'legacy removal contract passed'
