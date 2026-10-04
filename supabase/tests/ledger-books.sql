-- #440 foundation regression, based on #435/#437/#438 resolution comments.
-- Run ONLY against the separate local scratch DB after cloning the local schema:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_440_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-books.sql
-- Before #440 migrations, the expected first failure is "missing public.ledger_books".
-- No pgTAP/dependencies. All fixtures, helper functions and DDL roll back.
-- SET CONSTRAINTS ALL IMMEDIATE runs deferred checks at the commit boundary
-- without committing fixtures. This single-session check does not test races or
-- migration backfill; those require separate validation after migrations exist.

\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
begin
  if current_database() <> 'oat_ledger_books_440_test' then
    raise exception 'Run only in oat_ledger_books_440_test (never the shared postgres DB)';
  end if;
  assert to_regclass('public.ledger_books') is not null,
    '#440 expected red: missing public.ledger_books';
  assert exists (
    select 1 from pg_attribute
    where attrelid = 'public.ledger_entries'::regclass
      and attname = 'book_id' and attnotnull and not attisdropped
  ), 'ledger_entries.book_id must be NOT NULL';
  assert exists (
    select 1 from pg_attribute
    where attrelid = 'public.ledger_entries'::regclass
      and attname = 'is_shared' and not attisdropped
  ), '#440 must retain legacy is_shared';
  assert to_regprocedure('public.make_default_ledger_book(uuid)') is not null,
    'missing owner-only default replacement RPC';
  assert to_regprocedure('public.search_ledger_entries(uuid,text,text,integer,integer)') is not null,
    '#440 must retain the old search RPC';
  assert (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.ledger_books'::regclass, 'public.ledger_entries'::regclass)),
    'books and entries must both enable RLS';
end;
$$;

create temporary table fixture_ids (key text primary key, id uuid not null);
grant select on fixture_ids to authenticated, anon;

create function pg_temp.fid(p_key text) returns uuid language sql stable as $$
  select id from pg_temp.fixture_ids where key = p_key;
$$;

create function pg_temp.ok(p_condition boolean, p_message text) returns void
language plpgsql as $$
begin
  assert p_condition is true, p_message;
  raise notice 'ok: %', p_message;
end;
$$;

-- Invoker rights are intentional: denied SQL must run as the current test actor.
-- Only authorization/constraint/business errors count; syntax errors and missing
-- relations/functions always fail the test. Failed attempts roll back locally.
create function pg_temp.denied(
  p_sql text, p_message text, p_require_error boolean default false,
  p_check_deferred boolean default false
) returns void language plpgsql as $$
declare
  rejected boolean := false;
  affected bigint;
begin
  begin
    execute p_sql;
    get diagnostics affected = row_count;
    if p_check_deferred then
      set constraints all immediate;
    end if;
    rejected := not p_require_error and affected = 0;
    -- Roll back even unexpected success, so it cannot corrupt later fixtures.
    raise exception using errcode = 'ZX001', message = 'rollback attempted write';
  exception
    when sqlstate 'ZX001' then null;
    when integrity_constraint_violation or insufficient_privilege
      or raise_exception or invalid_parameter_value then
      rejected := true;
  end;
  perform pg_temp.ok(rejected, p_message);
end;
$$;

create function pg_temp.actor(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

insert into fixture_ids
select key, gen_random_uuid() from unnest(array[
  'h1','h2','a1','a2','b1','b2','shared1','shared2','private_a1','private_a2',
  'private_b1','private_b2','entry_a1','entry_a2','entry_b1','entry_b2',
  'entry_personal_a1','entry_personal_a2','entry_personal_b1','entry_personal_b2',
  'account','payment','category','tag','transfer','legacy_shared','legacy_personal',
  'legacy_personal2'
]) as keys(key);

-- Suppress ONLY automatic auth onboarding while making the four fixture users;
-- household INSERT/book seeding and every book/entry trigger stay enabled.
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.fid(key), key || '@ledger-books-440.invalid', '{}'::jsonb
from unnest(array['a1','a2','b1','b2']) as users(key);
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, name)
select pg_temp.fid(key), key || '@ledger-books-440.invalid', key
from unnest(array['a1','a2','b1','b2']) as users(key);

insert into public.households (id, name) values
  (pg_temp.fid('h1'), 'Regression household A'),
  (pg_temp.fid('h2'), 'Regression household B');
insert into public.household_members (household_id, user_id, role) values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), 'owner'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), 'owner'),
  (pg_temp.fid('h2'), pg_temp.fid('b2'), 'member');

select pg_temp.ok((select count(*) = 2 from public.ledger_books
  where household_id in (pg_temp.fid('h1'), pg_temp.fid('h2'))
    and name = '생활비' and visibility = 'shared' and is_default and archived_at is null),
  'household INSERT seeds an active shared 생활비 default for each household');
insert into fixture_ids select 'default1', id from public.ledger_books
where household_id = pg_temp.fid('h1') and is_default;
insert into fixture_ids select 'default2', id from public.ledger_books
where household_id = pg_temp.fid('h2') and is_default;
set constraints all immediate;
set constraints all deferred;

-- Bypass RLS here to prove DB invariants also protect privileged callers.
select pg_temp.denied($sql$update public.ledger_books set is_default = false
  where id = pg_temp.fid('default1')$sql$,
  'a transaction cannot leave zero defaults', true, true);
select pg_temp.denied($sql$update public.ledger_books set archived_at = now()
  where id = pg_temp.fid('default1')$sql$,
  'the default cannot be archived', true, true);
select pg_temp.denied($sql$delete from public.ledger_books
  where id = pg_temp.fid('default1')$sql$,
  'the default cannot be deleted', true, true);
select pg_temp.denied($sql$insert into public.ledger_books
  (household_id, name, visibility, created_by, is_default)
  values (pg_temp.fid('h1'), 'Second default', 'shared', pg_temp.fid('a1'), true)$sql$,
  'a transaction cannot leave two defaults', true, true);
select pg_temp.denied($sql$insert into public.ledger_books
  (household_id, name, visibility, created_by, is_default)
  values (pg_temp.fid('h1'), 'Personal default', 'personal', pg_temp.fid('a1'), true)$sql$,
  'a personal book cannot be default', true, true);

set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('shared1'), pg_temp.fid('h1'), '  Trip  ', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('private_a1'), pg_temp.fid('h1'), 'Trip', 'personal', pg_temp.fid('a1'));
select pg_temp.ok((select name = 'Trip' from public.ledger_books
  where id = pg_temp.fid('shared1')), 'names are trimmed on insert');
select pg_temp.actor(pg_temp.fid('a2'));
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('private_a2'), pg_temp.fid('h1'), 'Trip', 'personal', pg_temp.fid('a2'));
select pg_temp.actor(pg_temp.fid('b1'));
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('shared2'), pg_temp.fid('h2'), 'Trip', 'shared', pg_temp.fid('b1')),
  (pg_temp.fid('private_b1'), pg_temp.fid('h2'), 'Trip', 'personal', pg_temp.fid('b1'));
select pg_temp.actor(pg_temp.fid('b2'));
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  (pg_temp.fid('private_b2'), pg_temp.fid('h2'), 'Trip', 'personal', pg_temp.fid('b2'));
reset role;

-- The same visible name in another user's personal scope must neither leak nor
-- collide. Exercise both households and both roles, rather than one happy path.
do $$
declare
  u text;
  h text;
  own_book text;
  shared_book text;
  peer_book text;
  other_book text;
begin
  foreach u in array array['a1','a2','b1','b2'] loop
    h := case when u like 'a%' then 'h1' else 'h2' end;
    shared_book := case when h = 'h1' then 'shared1' else 'shared2' end;
    own_book := 'private_' || u;
    peer_book := 'private_' || case u when 'a1' then 'a2' when 'a2' then 'a1'
      when 'b1' then 'b2' else 'b1' end;
    other_book := case when h = 'h1' then 'shared2' else 'shared1' end;
    execute 'set local role authenticated';
    perform pg_temp.actor(pg_temp.fid(u));
    perform pg_temp.ok(current_user = 'authenticated' and auth.uid() = pg_temp.fid(u),
      u || ': tests run with authenticated RLS, not an admin');
    perform pg_temp.ok((select count(*) = 3 from public.ledger_books),
      u || ': only household default/shared and own personal book are visible');
    perform pg_temp.ok(not exists (select 1 from public.ledger_books
      where id in (pg_temp.fid(peer_book), pg_temp.fid(other_book))),
      u || ': peer personal and foreign household names are invisible by ID');
    perform pg_temp.ok((select count(*) = 2 from public.ledger_books where name ilike 'trip'),
      u || ': name search does not reveal a peer personal book');
    perform pg_temp.denied(format('update public.ledger_books set name = %L where id = %L',
      'Leaked', pg_temp.fid(peer_book)), u || ': cannot rename peer personal book');
    perform pg_temp.denied(format('delete from public.ledger_books where id = %L',
      pg_temp.fid(peer_book)), u || ': cannot delete peer personal book');
    perform pg_temp.denied(format('update public.ledger_books set archived_at = now() where id = %L',
      pg_temp.fid(other_book)), u || ': cannot archive a foreign household book');
    perform pg_temp.denied(format('delete from public.ledger_books where id = %L',
      pg_temp.fid(other_book)), u || ': cannot delete a foreign household book');
    perform pg_temp.denied(format('insert into public.ledger_books
      (household_id,name,visibility,created_by) values (%L,%L,%L,%L)',
      pg_temp.fid(case when h = 'h1' then 'h2' else 'h1' end), 'Injected', 'shared', pg_temp.fid(u)),
      u || ': cannot create a foreign household book', true);
    perform pg_temp.denied(format('insert into public.ledger_books
      (household_id,name,visibility,created_by) values (%L,%L,%L,%L)',
      pg_temp.fid(h), 'Injected', 'personal', pg_temp.fid(case when u = 'a1' then 'a2' else 'a1' end)),
      u || ': cannot create a personal book for another user', true);
    update public.ledger_books set name = '  Renamed  ' where id = pg_temp.fid(shared_book);
    perform pg_temp.ok((select name = 'Renamed' from public.ledger_books where id = pg_temp.fid(shared_book)),
      u || ': any household member can rename shared books, trimming on update');
    update public.ledger_books set name = 'Trip' where id = pg_temp.fid(shared_book);
    update public.ledger_books set name = 'Own renamed' where id = pg_temp.fid(own_book);
    perform pg_temp.ok((select name = 'Own renamed' from public.ledger_books where id = pg_temp.fid(own_book)),
      u || ': creator can rename own personal book');
    update public.ledger_books set name = 'Trip' where id = pg_temp.fid(own_book);
    execute 'reset role';
  end loop;
end;
$$;

-- Normalization and immutable identities must hold even without RLS.
do $$
declare
  col text;
  value text;
begin
  foreach value in array array['', '   '] loop
    perform pg_temp.denied(format('insert into public.ledger_books
      (household_id,name,visibility,created_by) values (%L,%L,%L,%L)',
      pg_temp.fid('h1'), value, 'shared', pg_temp.fid('a1')), 'empty names are rejected', true);
    perform pg_temp.denied(format('update public.ledger_books set name = %L where id = %L',
      value, pg_temp.fid('shared1')), 'empty name updates are rejected', true);
  end loop;
  foreach value in array array['shared','personal'] loop
    perform pg_temp.denied(format('insert into public.ledger_books
      (household_id,name,visibility,created_by) values (%L,%L,%L,%L)',
      pg_temp.fid('h1'), '  tRiP  ', value, pg_temp.fid('a1')),
      value || ' names are scoped, trimmed and case-insensitive', true);
  end loop;
  perform pg_temp.denied($sql$insert into public.ledger_books
    (household_id,name,visibility) values (pg_temp.fid('h1'),'No creator','personal')$sql$,
    'personal books require a creator', true);
  perform pg_temp.denied($sql$insert into public.ledger_books
    (household_id,name,visibility) values (pg_temp.fid('h1'),'Unattributed','shared')$sql$,
    'only the system-seeded shared default may omit its creator', true);
  foreach col in array array['household_id','visibility','created_by'] loop
    value := case col when 'household_id' then pg_temp.fid('h2')::text
      when 'visibility' then 'personal' else pg_temp.fid('a2')::text end;
    perform pg_temp.denied(format('update public.ledger_books set %I = %L where id = %L',
      col, value, pg_temp.fid('shared1')), 'book ' || col || ' is immutable', true);
  end loop;
end;
$$;

-- Owner-only, atomic default replacement: old default stays a normal shared book.
set local role authenticated;
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.denied($sql$select public.make_default_ledger_book(pg_temp.fid('shared1'))$sql$,
  'members cannot replace the default', true);
select pg_temp.denied($sql$update public.ledger_books set is_default = false
  where id = pg_temp.fid('default1')$sql$, 'members cannot directly clear the default', false, true);
select pg_temp.actor(pg_temp.fid('a1'));
select pg_temp.denied($sql$select public.make_default_ledger_book(pg_temp.fid('shared2'))$sql$,
  'owner cannot replace another household default', true);
select pg_temp.denied($sql$select public.make_default_ledger_book(pg_temp.fid('private_a1'))$sql$,
  'owner cannot make a personal book default', true);
select public.make_default_ledger_book(pg_temp.fid('shared1'));
set constraints all immediate;
select pg_temp.ok((select count(*) = 1 and bool_and(id = pg_temp.fid('shared1'))
  from public.ledger_books where household_id = pg_temp.fid('h1') and is_default),
  'replacement survives deferred checks with exactly one new active shared default');
select public.make_default_ledger_book(pg_temp.fid('default1'));
set constraints all deferred;
reset role;

-- Non-null financial endpoints, category and tags make preservation checks real.
insert into public.accounts (id, household_id, owner_id, name, balance)
values (pg_temp.fid('account'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Regression bank', 1000.00);
insert into public.payment_methods (id, household_id, owner_id, name, type, balance)
values (pg_temp.fid('payment'), pg_temp.fid('h1'), pg_temp.fid('a1'), 'Regression cash', 'cash', 400.00);
insert into public.categories (id, household_id, name, type)
values (pg_temp.fid('category'), pg_temp.fid('h1'), 'Regression expense', 'expense');
insert into public.ledger_tags (id, household_id, name, name_normalized)
values (pg_temp.fid('tag'), pg_temp.fid('h1'), 'Keep', 'keep');

set local role authenticated;
do $$
declare
  u text;
  h text;
  shared_book text;
begin
  foreach u in array array['a1','a2','b1','b2'] loop
    h := case when u like 'a%' then 'h1' else 'h2' end;
    shared_book := case when h = 'h1' then 'shared1' else 'shared2' end;
    perform pg_temp.actor(pg_temp.fid(u));
    insert into public.ledger_entries
      (id, household_id, owner_id, book_id, type, amount, title, memo, transacted_at, is_shared)
    values
      (pg_temp.fid('entry_' || u), pg_temp.fid(h), pg_temp.fid(u), pg_temp.fid(shared_book),
       'expense', 12.34, 'needle shared ' || u, 'memo ' || u, '2026-09-01 12:00:00+00', true),
      (pg_temp.fid('entry_personal_' || u), pg_temp.fid(h), pg_temp.fid(u), pg_temp.fid('private_' || u),
       'expense', 56.78, 'needle personal ' || u, 'secret ' || u, '2026-09-02 12:00:00+00', false);
  end loop;
end;
$$;
select pg_temp.actor(pg_temp.fid('a1'));
update public.ledger_entries set category_id = pg_temp.fid('category'),
  from_payment_method_id = pg_temp.fid('payment') where id = pg_temp.fid('entry_a1');
insert into public.ledger_entries
  (id, household_id, owner_id, book_id, type, amount, from_account_id,
   to_payment_method_id, title, memo, transacted_at, is_shared)
values (pg_temp.fid('transfer'), pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('shared1'),
  'transfer', 75.25, pg_temp.fid('account'), pg_temp.fid('payment'),
  'Transfer preservation', 'keep memo', '2026-08-31 09:00:00+00', true);
insert into public.ledger_entry_tags (ledger_entry_id, tag_id, household_id)
values (pg_temp.fid('entry_a1'), pg_temp.fid('tag'), pg_temp.fid('h1')),
  (pg_temp.fid('transfer'), pg_temp.fid('tag'), pg_temp.fid('h1'));
reset role;

-- Same-household FK and author/identity rules must resist privileged writes too.
select pg_temp.denied($sql$update public.ledger_entries set book_id = pg_temp.fid('shared2')
  where id = pg_temp.fid('entry_a1')$sql$, 'same-household book FK rejects foreign IDs', true);
select pg_temp.denied($sql$insert into public.ledger_entries
  (household_id,owner_id,book_id,type,amount,transacted_at,is_shared)
  values (pg_temp.fid('h1'),pg_temp.fid('a1'),pg_temp.fid('private_a2'),
    'expense',1,now(),false)$sql$, 'personal entry author must equal book creator', true);
select pg_temp.denied($sql$update public.ledger_entries set book_id = pg_temp.fid('private_a2')
  where id = pg_temp.fid('entry_a1')$sql$, 'moves also enforce personal entry author', true);
select pg_temp.denied($sql$update public.ledger_entries set owner_id = pg_temp.fid('a2')
  where id = pg_temp.fid('entry_a1')$sql$, 'entry owner identity is immutable', true);
select pg_temp.denied($sql$update public.ledger_entries set household_id = pg_temp.fid('h2')
  where id = pg_temp.fid('entry_a1')$sql$, 'entry household identity is immutable', true);
select pg_temp.denied($sql$update public.ledger_entries set book_id = null
  where id = pg_temp.fid('entry_a1')$sql$, 'explicit null book IDs cannot orphan entries', true);
select pg_temp.denied($sql$delete from public.ledger_books where id = pg_temp.fid('shared1')$sql$,
  'nonempty books cannot be deleted even by an admin', true);

set local role authenticated;
do $$
declare
  u text;
  h text;
  peer text;
  expected uuid[];
  actual uuid[];
  scope text;
begin
  foreach u in array array['a1','a2','b1','b2'] loop
    h := case when u like 'a%' then 'h1' else 'h2' end;
    peer := case u when 'a1' then 'a2' when 'a2' then 'a1' when 'b1' then 'b2' else 'b1' end;
    perform pg_temp.actor(pg_temp.fid(u));
    select array_agg(id order by id) into actual from public.ledger_entries where title like 'needle%';
    select array_agg(id order by id) into expected from (values
      (pg_temp.fid('entry_' || u)), (pg_temp.fid('entry_' || peer)),
      (pg_temp.fid('entry_personal_' || u))) as ids(id);
    perform pg_temp.ok(actual = expected, u || ': exact shared plus own-personal entry visibility');
    foreach scope in array array['shared','personal'] loop
      select array_agg(id order by id) into actual
      from public.search_ledger_entries(pg_temp.fid(h), 'needle', scope, 0, 51);
      select array_agg(id order by id) into expected from public.ledger_entries
      where title like 'needle%' and (case when scope = 'shared' then is_shared else not is_shared end);
      perform pg_temp.ok(actual = expected, u || ': old ' || scope || ' search preserves RLS privacy');
      perform pg_temp.ok(not exists (select 1 from public.search_ledger_entries(
        pg_temp.fid(case when h = 'h1' then 'h2' else 'h1' end), 'needle', scope, 0, 51)),
        u || ': old search rejects foreign household results');
    end loop;
    perform pg_temp.denied(format('update public.ledger_entries set amount = 999 where id = %L',
      pg_temp.fid('entry_' || peer)), u || ': cannot update peer shared entry');
    perform pg_temp.denied(format('delete from public.ledger_entries where id = %L',
      pg_temp.fid('entry_' || peer)), u || ': cannot delete peer shared entry');
    perform pg_temp.denied(format('update public.ledger_entries set book_id = %L where id = %L',
      pg_temp.fid('private_' || u), pg_temp.fid('entry_' || peer)),
      u || ': cannot directly reclassify peer shared entry');
    perform pg_temp.denied(format('update public.ledger_entries set amount = 999 where id = %L',
      pg_temp.fid('entry_personal_' || peer)), u || ': cannot update peer personal entry');
    perform pg_temp.denied(format('delete from public.ledger_entries where id = %L',
      pg_temp.fid('entry_personal_' || peer)), u || ': cannot delete peer personal entry');
    perform pg_temp.denied(format('insert into public.ledger_entries
      (household_id,owner_id,book_id,type,amount,transacted_at,is_shared)
      values (%L,%L,%L,%L,1,now(),true)', pg_temp.fid(h), pg_temp.fid(peer),
      pg_temp.fid(case when h = 'h1' then 'shared1' else 'shared2' end), 'expense'),
      u || ': cannot forge another author on insert', true);
    update public.ledger_entries set memo = 'own edit' where id = pg_temp.fid('entry_personal_' || u);
    perform pg_temp.ok((select memo = 'own edit' from public.ledger_entries
      where id = pg_temp.fid('entry_personal_' || u)), u || ': can update own personal entry');
    delete from public.ledger_entries where id = pg_temp.fid('entry_personal_' || u);
    perform pg_temp.ok(not exists (select 1 from public.ledger_entries
      where id = pg_temp.fid('entry_personal_' || u)), u || ': can delete own personal entry');
    -- Restore for the next actor's exact visibility and search assertions.
    insert into public.ledger_entries
      (id,household_id,owner_id,book_id,type,amount,title,transacted_at,is_shared)
    values (pg_temp.fid('entry_personal_' || u),pg_temp.fid(h),pg_temp.fid(u),
      pg_temp.fid('private_' || u),'expense',56.78,'needle personal ' || u,now(),false);
  end loop;
end;
$$;
reset role;

-- Snapshot every entry field except the intended book/publicity change and the
-- normal edit timestamp. Financial rows and existing tag joins must be identical.
create temporary table preserved as
select 'entry:' || id::text as key, to_jsonb(e) - array['book_id','is_shared','updated_at'] as value
from public.ledger_entries e where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))
union all select 'account', to_jsonb(a) from public.accounts a where id = pg_temp.fid('account')
union all select 'payment', to_jsonb(p) from public.payment_methods p where id = pg_temp.fid('payment')
union all select 'tags', jsonb_agg(to_jsonb(t) order by ledger_entry_id,tag_id)
from public.ledger_entry_tags t where ledger_entry_id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'));

set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
update public.ledger_entries set book_id = pg_temp.fid('private_a1')
where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'));
select pg_temp.ok((select count(*) = 2 and bool_and(not is_shared)
  from public.ledger_entries where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))),
  'book-only shared-to-personal updates synchronize legacy publicity');
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.ok(not exists (select 1 from public.ledger_entries
  where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))),
  'reclassified entries disappear from the peer view');
select pg_temp.ok(not exists (select 1 from public.search_ledger_entries(pg_temp.fid('h1'),'needle','shared',0,51)
  where id = pg_temp.fid('entry_a1')), 'old shared search cannot recover a moved personal entry');
select pg_temp.actor(pg_temp.fid('a1'));
update public.ledger_entries set book_id = pg_temp.fid('default1')
where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'));
select pg_temp.ok((select count(*) = 2 and bool_and(is_shared)
  from public.ledger_entries where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))),
  'book-only personal-to-shared updates synchronize legacy publicity');
update public.ledger_entries set book_id = pg_temp.fid('shared1')
where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'));
reset role;
select pg_temp.ok(not exists (
  (select * from preserved except select * from (
    select 'entry:' || id::text, to_jsonb(e) - array['book_id','is_shared','updated_at']
    from public.ledger_entries e where id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))
    union all select 'account', to_jsonb(a) from public.accounts a where id = pg_temp.fid('account')
    union all select 'payment', to_jsonb(p) from public.payment_methods p where id = pg_temp.fid('payment')
    union all select 'tags', jsonb_agg(to_jsonb(t) order by ledger_entry_id,tag_id)
    from public.ledger_entry_tags t where ledger_entry_id in (pg_temp.fid('entry_a1'),pg_temp.fid('transfer'))
  ) as after_moves)
), 'book-only expense/transfer moves preserve IDs, authors, money, dates, endpoints, category, tags and balances');

-- Legacy clients omit book_id; personal compatibility seed is reused atomically.
set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
insert into public.ledger_entries (id, household_id, owner_id, type, amount, transacted_at, is_shared)
values (pg_temp.fid('legacy_shared'),pg_temp.fid('h1'),pg_temp.fid('a1'),'expense',10,now(),true),
  (pg_temp.fid('legacy_personal'),pg_temp.fid('h1'),pg_temp.fid('a1'),'expense',11,now(),false),
  (pg_temp.fid('legacy_personal2'),pg_temp.fid('h1'),pg_temp.fid('a1'),'income',12,now(),false)
returning id,book_id; -- Fresh private seed must also be visible to INSERT RETURNING.
select pg_temp.ok((select book_id = pg_temp.fid('default1') from public.ledger_entries
  where id = pg_temp.fid('legacy_shared')), 'legacy shared insert resolves the current default');
select pg_temp.ok((select count(distinct e.book_id) = 1 and bool_and(
    b.name = '개인 생활비' and b.visibility = 'personal' and b.created_by = pg_temp.fid('a1'))
  from public.ledger_entries e join public.ledger_books b on b.id = e.book_id
  where e.id in (pg_temp.fid('legacy_personal'),pg_temp.fid('legacy_personal2'))),
  'legacy personal inserts seed/reuse the author 개인 생활비');
select pg_temp.denied($sql$update public.ledger_entries set is_shared = false
  where id = pg_temp.fid('legacy_shared')$sql$, 'legacy is_shared-only shared-to-personal update fails', true);
select pg_temp.denied($sql$update public.ledger_entries set is_shared = true
  where id = pg_temp.fid('legacy_personal')$sql$, 'legacy is_shared-only personal-to-shared update fails', true);
select pg_temp.denied($sql$update public.ledger_books set name = 'Changed compatibility name'
  where id = (select book_id from public.ledger_entries where id = pg_temp.fid('legacy_personal'))$sql$,
  'legacy personal compatibility book cannot be renamed');
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.ok(not exists (select 1 from public.ledger_books
  where name = '개인 생활비'), 'legacy personal seed name stays invisible to peers');
reset role;

-- Archived books remain readable, including old search, but reject every write
-- direction. Repeat for shared and personal books as the entry/book creator.
set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
do $$
declare
  book_key text;
  entry_key text;
  sql text;
begin
  foreach book_key in array array['shared1','private_a1'] loop
    entry_key := case when book_key = 'shared1' then 'entry_a1' else 'entry_personal_a1' end;
    update public.ledger_books set archived_at = now() where id = pg_temp.fid(book_key);
    perform pg_temp.ok(exists (select 1 from public.ledger_entries where id = pg_temp.fid(entry_key)),
      book_key || ': archived entries remain readable');
    perform pg_temp.ok(exists (select 1 from public.search_ledger_entries(pg_temp.fid('h1'),'needle',
      case when book_key = 'shared1' then 'shared' else 'personal' end,0,51)
      where id = pg_temp.fid(entry_key)), book_key || ': archived entries remain in old search');
    perform pg_temp.denied(format('insert into public.ledger_entries
      (household_id,owner_id,book_id,type,amount,transacted_at,is_shared)
      values (%L,%L,%L,%L,1,now(),%L)', pg_temp.fid('h1'),pg_temp.fid('a1'),
      pg_temp.fid(book_key),'expense',book_key = 'shared1'), book_key || ': archived entry insert fails', true);
    perform pg_temp.denied(format('update public.ledger_entries set memo = %L where id = %L',
      'Edited archive',pg_temp.fid(entry_key)), book_key || ': archived entry update fails');
    perform pg_temp.denied(format('delete from public.ledger_entries where id = %L',
      pg_temp.fid(entry_key)), book_key || ': archived entry delete fails');
    perform pg_temp.denied(format('update public.ledger_entries set book_id = %L where id = %L',
      pg_temp.fid('default1'),pg_temp.fid(entry_key)), book_key || ': move out of archive fails');
    perform pg_temp.denied(format('update public.ledger_entries set book_id = %L where id = %L',
      pg_temp.fid(book_key),pg_temp.fid('legacy_shared')), book_key || ': move into archive fails');
    perform pg_temp.denied(format('update public.ledger_books set name = %L where id = %L',
      'Renamed archive',pg_temp.fid(book_key)), book_key || ': archived rename fails');
    perform pg_temp.denied(format('delete from public.ledger_books where id = %L',
      pg_temp.fid(book_key)), book_key || ': archived deletion fails');
    perform pg_temp.denied(format('select public.make_default_ledger_book(%L)', pg_temp.fid(book_key)),
      book_key || ': archived/personal book cannot become default', true);
    update public.ledger_books set archived_at = null where id = pg_temp.fid(book_key);
    perform pg_temp.ok((select archived_at is null from public.ledger_books where id = pg_temp.fid(book_key)),
      book_key || ': creator can reactivate');
    update public.ledger_entries set memo = 'Edit after reactivation' where id = pg_temp.fid(entry_key);
    perform pg_temp.ok((select memo = 'Edit after reactivation' from public.ledger_entries
      where id = pg_temp.fid(entry_key)), book_key || ': writes work after reactivation');
  end loop;
end;
$$;
reset role;

-- Archived names still participate in uniqueness; privileged callers also
-- cannot edit entries in an archive (RLS denial alone is insufficient).
update public.ledger_books set archived_at = now() where id = pg_temp.fid('shared1');
select pg_temp.denied($sql$insert into public.ledger_books (household_id,name,visibility,created_by)
  values (pg_temp.fid('h1'),'trip','shared',pg_temp.fid('a1'))$sql$,
  'archived names still reserve their case-insensitive scope', true);
select pg_temp.denied($sql$update public.ledger_entries set amount = 123
  where id = pg_temp.fid('entry_a1')$sql$, 'privileged archived entry update fails', true);
select pg_temp.denied($sql$delete from public.ledger_entries
  where id = pg_temp.fid('entry_a1')$sql$, 'privileged archived entry delete fails', true);
update public.ledger_books set archived_at = null where id = pg_temp.fid('shared1');

-- Empty book deletion: creator/owner, never just any household member.
set local role authenticated;
select pg_temp.actor(pg_temp.fid('a1'));
insert into public.ledger_books (household_id,name,visibility,created_by)
values (pg_temp.fid('h1'),'Owner empty','shared',pg_temp.fid('a1'));
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.denied($sql$delete from public.ledger_books where name = 'Owner empty'$sql$,
  'noncreator member cannot delete an empty shared book');
insert into public.ledger_books (household_id,name,visibility,created_by)
values (pg_temp.fid('h1'),'Member empty','shared',pg_temp.fid('a2')),
  (pg_temp.fid('h1'),'Personal empty','personal',pg_temp.fid('a2'));
delete from public.ledger_books where name = 'Personal empty';
select pg_temp.ok(not exists (select 1 from public.ledger_books where name = 'Personal empty'),
  'creator can delete an empty personal book');
delete from public.ledger_books where name = 'Member empty';
select pg_temp.ok(not exists (select 1 from public.ledger_books where name = 'Member empty'),
  'member creator can delete an empty shared book');
insert into public.ledger_books (household_id,name,visibility,created_by)
values (pg_temp.fid('h1'),'Member empty','shared',pg_temp.fid('a2'));
select pg_temp.actor(pg_temp.fid('a1'));
delete from public.ledger_books where name in ('Owner empty','Member empty');
select pg_temp.ok(not exists (select 1 from public.ledger_books where name in ('Owner empty','Member empty')),
  'household owner can delete empty shared books by any creator');
reset role;

-- Leaving a household revokes even the former creator's personal visibility.
delete from public.household_members where household_id = pg_temp.fid('h2') and user_id = pg_temp.fid('b2');
set local role authenticated;
select pg_temp.actor(pg_temp.fid('b2'));
select pg_temp.ok(not exists (select 1 from public.ledger_books), 'former members cannot see personal book names');
select pg_temp.ok(not exists (select 1 from public.ledger_entries), 'former members cannot see their old personal entries');
reset role;

set constraints all immediate;
select pg_temp.ok((select count(*) = 2 and bool_and(visibility = 'shared' and archived_at is null)
  from public.ledger_books where household_id in (pg_temp.fid('h1'),pg_temp.fid('h2')) and is_default),
  'final commit-time check: exactly one active shared default per fixture household');
rollback;
\echo ledger-books foundation regression passed (all fixtures rolled back)
