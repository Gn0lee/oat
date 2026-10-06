-- Regression coverage for the per-book latest entry input time (#460).
-- Run only against the isolated scratch DB:
-- docker exec -i supabase_db_oat psql -X -U supabase_admin \
--   -d oat_ledger_books_460_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-book-last-entries.sql
-- All fixtures roll back.

\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
declare
  v_fn regprocedure := to_regprocedure('public.ledger_book_last_entries(uuid)');
begin
  if current_database() !~ '^oat_ledger_books_[0-9a-z_]+_test$' then
    raise exception 'Run only in an oat_ledger_books_*_test scratch DB (never the shared postgres DB)';
  end if;
  assert v_fn is not null, 'missing public.ledger_book_last_entries';
  assert not (select prosecdef from pg_proc where oid = v_fn), 'aggregate must be SECURITY INVOKER (RLS applies)';
  assert has_function_privilege('authenticated', v_fn, 'execute'), 'authenticated must execute the aggregate';
  assert not has_function_privilege('anon', v_fn, 'execute'), 'anon must not execute the aggregate';
  assert exists (
    select 1 from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'public.ledger_entries'::regclass and a.attname = 'book_id'
  ), 'ledger_entries.book_id must lead an index';
end;
$$;

create temporary table ids as select key, gen_random_uuid() id from unnest(array[
  'a1', 'a2', 'b1', 'h1', 'h2', 'trip', 'empty', 'personal_a1', 'personal_a2'
]) keys(key);
grant select on ids to authenticated;
create function pg_temp.id(k text) returns uuid language sql stable as $$ select id from ids where key = k $$;
create function pg_temp.actor(k text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.id(k)::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.id(k), 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.last_entries(k text) returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(i.key, r.last_entry_at), '{}'::jsonb)
  from public.ledger_book_last_entries(pg_temp.id(k)) r
  join ids i on i.id = r.book_id
$$;

alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id, email) select id, key || '@460-last-entries.invalid' from ids where key in ('a1', 'a2', 'b1');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id, email, name) select id, key || '@460-last-entries.invalid', key from ids
where key in ('a1', 'a2', 'b1');
insert into public.households(id, name) values (pg_temp.id('h1'), '460 A'), (pg_temp.id('h2'), '460 B');
insert into public.household_members(household_id, user_id, role) values
  (pg_temp.id('h1'), pg_temp.id('a1'), 'owner'),
  (pg_temp.id('h1'), pg_temp.id('a2'), 'member'),
  (pg_temp.id('h2'), pg_temp.id('b1'), 'owner');
insert into ids select 'default1', id from public.ledger_books where household_id = pg_temp.id('h1') and is_default;
insert into ids select 'default2', id from public.ledger_books where household_id = pg_temp.id('h2') and is_default;
insert into public.ledger_books(id, household_id, name, visibility, created_by) values
  (pg_temp.id('trip'), pg_temp.id('h1'), '여행', 'shared', pg_temp.id('a1')),
  (pg_temp.id('empty'), pg_temp.id('h1'), '빈 장부', 'shared', pg_temp.id('a1')),
  (pg_temp.id('personal_a1'), pg_temp.id('h1'), 'A1 용돈', 'personal', pg_temp.id('a1')),
  (pg_temp.id('personal_a2'), pg_temp.id('h1'), 'A2 용돈', 'personal', pg_temp.id('a2'));

-- created_at is the input time; transacted_at is deliberately unrelated to it.
insert into public.ledger_entries(household_id, owner_id, book_id, type, amount, title, transacted_at, created_at)
values
  (pg_temp.id('h1'), pg_temp.id('a1'), pg_temp.id('default1'), 'expense', 1, 'old', '2026-10-05T00:00:00Z', '2026-09-20T00:00:00Z'),
  (pg_temp.id('h1'), pg_temp.id('a1'), pg_temp.id('default1'), 'expense', 1, 'new', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
  -- a2 backfills an old trip expense today: the shared book counts for a1 too.
  (pg_temp.id('h1'), pg_temp.id('a2'), pg_temp.id('trip'), 'expense', 1, 'trip', '2026-08-01T00:00:00Z', '2026-10-03T00:00:00Z'),
  (pg_temp.id('h1'), pg_temp.id('a1'), pg_temp.id('personal_a1'), 'expense', 1, 'a1', '2026-10-02T00:00:00Z', '2026-10-02T00:00:00Z'),
  (pg_temp.id('h1'), pg_temp.id('a2'), pg_temp.id('personal_a2'), 'expense', 1, 'a2', '2026-10-04T00:00:00Z', '2026-10-04T00:00:00Z'),
  (pg_temp.id('h2'), pg_temp.id('b1'), pg_temp.id('default2'), 'expense', 1, 'b1', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z');

set local role authenticated;

select pg_temp.actor('a1');
do $$
declare
  got jsonb := pg_temp.last_entries('h1');
begin
  assert got = jsonb_build_object(
    'default1', '2026-10-01T00:00:00+00:00'::timestamptz,
    'trip', '2026-10-03T00:00:00+00:00'::timestamptz,
    'personal_a1', '2026-10-02T00:00:00+00:00'::timestamptz
  ), 'a1 sees latest input per visible book: ' || got::text;
  raise notice 'ok: latest created_at per book, not transacted_at';
  raise notice 'ok: a household member''s shared-book entry counts';
  raise notice 'ok: another member''s personal book and empty books are absent';
  assert pg_temp.last_entries('h2') = '{}'::jsonb, 'a1 cannot aggregate another household';
  raise notice 'ok: another household is absent';
end;
$$;

select pg_temp.actor('a2');
do $$
declare
  got jsonb := pg_temp.last_entries('h1');
begin
  assert got ? 'personal_a2' and not got ? 'personal_a1' and got ? 'trip',
    'a2 sees only their own personal book: ' || got::text;
  raise notice 'ok: each member sees only their own personal book';
end;
$$;

select pg_temp.actor('b1');
do $$
begin
  assert pg_temp.last_entries('h1') = '{}'::jsonb, 'b1 cannot aggregate household A';
  assert pg_temp.last_entries('h2') ? 'default2', 'b1 sees their own household';
  raise notice 'ok: household isolation from the other side';
end;
$$;

rollback;
\echo 'ledger book last entries contract passed'
