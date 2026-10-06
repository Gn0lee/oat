-- Regression coverage for all-books / single-book ledger search with a stable cursor (#445).
-- Run only against the isolated scratch DB:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_445_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-scoped-search.sql
-- All fixtures roll back.

\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
declare
  v_fn regprocedure := to_regprocedure(
    'public.search_ledger_entries_scoped(uuid,text,uuid,timestamptz,timestamptz,uuid,integer)');
begin
  if current_database() !~ '^oat_ledger_books_[0-9a-z_]+_test$' then
    raise exception 'Run only in an oat_ledger_books_*_test scratch DB (never the shared postgres DB)';
  end if;
  assert v_fn is not null, 'missing public.search_ledger_entries_scoped';
  assert not (select prosecdef from pg_proc where oid = v_fn), 'scoped search must be SECURITY INVOKER';
  assert has_function_privilege('authenticated', v_fn, 'execute'), 'authenticated must execute scoped search';
  assert not has_function_privilege('anon', v_fn, 'execute'), 'anon must not execute scoped search';
  assert to_regprocedure('public.search_ledger_entries(uuid,text,text,integer,integer)') is null,
    'legacy search RPC is removed in #446';
end;
$$;

create temporary table fixture_ids (key text primary key, id uuid not null);
grant select on fixture_ids to authenticated;
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
-- Titles of a search result, newest first, as one comparable string.
create function pg_temp.titles(p_household text, p_query text, p_book text default null, p_limit integer default 50)
returns text language sql as $$
  select coalesce(string_agg(r.title, ',' order by r.ord), '')
  from (
    select s.title, row_number() over () as ord
    from public.search_ledger_entries_scoped(pg_temp.fid(p_household), p_query,
      case when p_book is null then null else pg_temp.fid(p_book) end,
      null, null, null, p_limit) s
  ) r;
$$;

insert into fixture_ids
select key, gen_random_uuid() from unnest(array[
  'h1','h2','a1','a2','b1','travel','archived','empty','p_a1','p_a2','p_b1','shared_b'
]) as keys(key);

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.fid(key), key || '@ledger-scoped-search.invalid', '{}'::jsonb
from unnest(array['a1','a2','b1']) as users(key);
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, email, name)
select pg_temp.fid(key), key || '@ledger-scoped-search.invalid', key
from unnest(array['a1','a2','b1']) as users(key);
insert into public.households (id, name) values
  (pg_temp.fid('h1'), 'Search household A'), (pg_temp.fid('h2'), 'Search household B');
insert into public.household_members (household_id, user_id, role) values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), 'owner'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), 'member'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), 'owner');
insert into fixture_ids select 'default1', id from public.ledger_books
where household_id = pg_temp.fid('h1') and is_default;
insert into public.ledger_books (id, household_id, name, visibility, created_by) values
  -- The book name contains the search word on purpose: book names are never searched.
  (pg_temp.fid('travel'), pg_temp.fid('h1'), 'Coffee trip', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('archived'), pg_temp.fid('h1'), 'Old house', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('empty'), pg_temp.fid('h1'), 'Empty', 'shared', pg_temp.fid('a1')),
  (pg_temp.fid('p_a1'), pg_temp.fid('h1'), 'A1 private', 'personal', pg_temp.fid('a1')),
  (pg_temp.fid('p_a2'), pg_temp.fid('h1'), 'A2 private', 'personal', pg_temp.fid('a2')),
  (pg_temp.fid('p_b1'), pg_temp.fid('h2'), 'B1 private', 'personal', pg_temp.fid('b1')),
  (pg_temp.fid('shared_b'), pg_temp.fid('h2'), 'B shared', 'shared', pg_temp.fid('b1'));

-- Fixture rows are inserted by the admin role so ties on transacted_at/created_at are exact.
insert into public.ledger_entries
  (household_id, owner_id, book_id, type, amount, title, memo, transacted_at, created_at)
values
  (pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('default1'), 'expense', 10, 'coffee d1', null,
    '2026-10-03T01:00:00Z', '2026-10-03T01:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), pg_temp.fid('travel'), 'expense', 20, 'lunch', 'with coffee',
    '2026-10-03T01:00:00Z', '2026-10-03T01:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('travel'), 'expense', 30, 'coffee t2', null,
    '2026-10-03T01:00:00Z', '2026-10-03T00:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('travel'), 'expense', 40, 'dinner', null,
    '2026-10-02T01:00:00Z', '2026-10-02T01:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('archived'), 'transfer', 50, 'coffee old', null,
    '2026-09-01T01:00:00Z', '2026-09-01T01:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a1'), pg_temp.fid('p_a1'), 'expense', 60, 'coffee mine', null,
    '2026-10-04T01:00:00Z', '2026-10-04T01:00:00Z'),
  (pg_temp.fid('h1'), pg_temp.fid('a2'), pg_temp.fid('p_a2'), 'expense', 70, 'coffee secret', null,
    '2026-10-05T01:00:00Z', '2026-10-05T01:00:00Z'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), pg_temp.fid('shared_b'), 'expense', 80, 'coffee other house', null,
    '2026-10-05T01:00:00Z', '2026-10-05T01:00:00Z'),
  (pg_temp.fid('h2'), pg_temp.fid('b1'), pg_temp.fid('p_b1'), 'expense', 90, 'coffee other private', null,
    '2026-10-05T01:00:00Z', '2026-10-05T01:00:00Z');
update public.ledger_books set archived_at = now() where id = pg_temp.fid('archived');

-- Same-instant ties are ordered by id DESC; record the expected order explicitly.
create temporary table tie_order as
select title, row_number() over (order by transacted_at desc, created_at desc, id desc) as ord
from public.ledger_entries
where household_id = pg_temp.fid('h1') and book_id in (pg_temp.fid('default1'), pg_temp.fid('travel'))
  and transacted_at = '2026-10-03T01:00:00Z' and created_at = '2026-10-03T01:00:00Z';
grant select on tie_order to authenticated;

set local role authenticated;

-- a1: all-books scope = shared books (incl. archived) + own personal book.
select pg_temp.actor(pg_temp.fid('a1'));
select pg_temp.ok(
  pg_temp.titles('h1', 'coffee') =
    'coffee mine,' || (select string_agg(title, ',' order by ord) from tie_order) || ',coffee t2,coffee old',
  'all scope returns visible title/memo matches newest first with id tie-break, archived included');
select pg_temp.ok(position('secret' in pg_temp.titles('h1', 'coffee')) = 0,
  'other member personal entries are never returned');
select pg_temp.ok(position('other' in pg_temp.titles('h1', 'coffee')) = 0,
  'other household entries are never returned');
select pg_temp.ok(position('dinner' in pg_temp.titles('h1', 'trip')) = 0
  and pg_temp.titles('h1', 'trip') = '', 'book name alone does not match');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'travel') = 'lunch,coffee t2',
  'single book scope ANDs the book with title/memo');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'archived') = 'coffee old',
  'archived book stays searchable');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'empty') = '', 'empty book returns no rows');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'p_a2') = '',
  'other member personal book id returns no rows');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'shared_b') = '',
  'other household book id returns no rows');
select pg_temp.ok(pg_temp.titles('h2', 'coffee') = '', 'other household id returns no rows');
select pg_temp.ok(pg_temp.titles('h1', ' c ') = '', 'queries shorter than 2 non-space chars return nothing');
select pg_temp.ok(pg_temp.titles('h1', '%%') = '', 'LIKE wildcards are escaped');

-- Keyset pages of size 1 walk the whole result without duplicates or gaps.
do $$
declare
  v_expected text := pg_temp.titles('h1', 'coffee');
  v_seen text[] := array[]::text[];
  v_row public.ledger_entries;
  v_t timestamptz;
  v_c timestamptz;
  v_id uuid;
  v_guard integer := 0;
begin
  loop
    select * into v_row
    from public.search_ledger_entries_scoped(pg_temp.fid('h1'), 'coffee', null, v_t, v_c, v_id, 1);
    exit when not found;
    v_seen := v_seen || v_row.title;
    v_t := v_row.transacted_at; v_c := v_row.created_at; v_id := v_row.id;
    v_guard := v_guard + 1;
    assert v_guard < 20, 'cursor pagination does not terminate';
  end loop;
  assert array_to_string(v_seen, ',') = v_expected,
    format('cursor pages %s must equal single page %s', array_to_string(v_seen, ','), v_expected);
  raise notice 'ok: cursor pages of 1 have no duplicates or gaps across same-instant ties';
end;
$$;

select pg_temp.ok(
  (select count(*) from public.search_ledger_entries_scoped(pg_temp.fid('h1'), 'coffee', null, null, null, null, 500)) <= 51,
  'page size is capped');

-- a2 sees shared rows and their own personal book only.
select pg_temp.actor(pg_temp.fid('a2'));
select pg_temp.ok(position('coffee secret' in pg_temp.titles('h1', 'coffee')) = 1
  and position('coffee mine' in pg_temp.titles('h1', 'coffee')) = 0,
  'second member sees own personal and not the first member personal');
select pg_temp.ok(pg_temp.titles('h1', 'coffee', 'p_a1') = '',
  'second member gets nothing from first member personal book id');

-- b1 sees only household B.
select pg_temp.actor(pg_temp.fid('b1'));
select pg_temp.ok(pg_temp.titles('h1', 'coffee') = '', 'non-member gets nothing for household A');
select pg_temp.ok(pg_temp.titles('h2', 'coffee') = 'coffee other house,coffee other private'
  or pg_temp.titles('h2', 'coffee') = 'coffee other private,coffee other house',
  'household B owner sees household B rows');

reset role;
rollback;
