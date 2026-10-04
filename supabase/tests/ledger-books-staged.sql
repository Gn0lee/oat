-- Run once on the baseline scratch clone: docker cp supabase supabase_db_oat:/tmp/issue440-supabase
-- docker exec supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_440_test -f /tmp/issue440-supabase/tests/ledger-books-staged.sql
-- Separate commits are intentional: fixture -> expand -> RPC/install -> each batch -> validate -> enforce.
\set ON_ERROR_STOP on
set plpgsql.check_asserts = on;
do $$ begin
  assert current_database() = 'oat_ledger_books_440_test', 'scratch database only';
  assert to_regclass('public.ledger_books') is null, 'requires baseline clone';
end $$;
begin;
create temporary table stage_ids as select key, gen_random_uuid() id from unnest(array[
  'owner','peer','h','empty','account','payment','category','tag','shared','personal','transfer'
]) keys(key);
create function pg_temp.sid(k text) returns uuid language sql stable as $$select id from stage_ids where key=k$$;
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id,email) select id,key||'@440-staged.invalid' from stage_ids where key in ('owner','peer');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id,email,name) select id,key||'@440-staged.invalid',key from stage_ids where key in ('owner','peer');
insert into public.households(id,name) values(pg_temp.sid('h'),'440 staged'),(pg_temp.sid('empty'),'440 empty');
insert into public.household_members(household_id,user_id,role) values
(pg_temp.sid('h'),pg_temp.sid('owner'),'owner'),(pg_temp.sid('h'),pg_temp.sid('peer'),'member');
insert into public.accounts(id,household_id,owner_id,name,balance,updated_at,balance_updated_at)
values(pg_temp.sid('account'),pg_temp.sid('h'),pg_temp.sid('owner'),'440 bank',987.65,'2025-01-01Z','2025-01-02Z');
insert into public.payment_methods(id,household_id,owner_id,name,type,balance)
values(pg_temp.sid('payment'),pg_temp.sid('h'),pg_temp.sid('owner'),'440 cash','cash',-123.45);
insert into public.categories(id,household_id,name,type) values(pg_temp.sid('category'),pg_temp.sid('h'),'440 expense','expense');
insert into public.ledger_tags(id,household_id,name,name_normalized) values(pg_temp.sid('tag'),pg_temp.sid('h'),'Keep','keep');
insert into public.ledger_entries(id,household_id,owner_id,type,amount,is_shared,from_account_id,to_payment_method_id,category_id,title,memo,transacted_at,created_at,updated_at)
select id,pg_temp.sid('h'),pg_temp.sid('owner'),case when key='transfer' then 'transfer' else 'expense' end::public.ledger_entry_type,
12.34,key<>'personal',pg_temp.sid('account'),case when key='transfer' then pg_temp.sid('payment') end,
case when key<>'transfer' then pg_temp.sid('category') end,'original '||key,'original memo','2024-02-03 04:05:06Z','2024-01-01Z','2024-01-02Z'
from stage_ids where key in ('shared','personal','transfer');
insert into public.ledger_entry_tags(ledger_entry_id,tag_id,household_id)
select id,pg_temp.sid('tag'),pg_temp.sid('h') from stage_ids where key in ('shared','personal','transfer');
insert into public.record_change_requests(household_id,requester_id,target_owner_id,target_type,target_id,request_type,target_snapshot)
values(pg_temp.sid('h'),pg_temp.sid('peer'),pg_temp.sid('owner'),'ledger_entry',pg_temp.sid('shared'),'update',jsonb_build_object('amount',12.34));
create temporary table stage_before as
select 'entries' relation,to_jsonb(e) data from public.ledger_entries e
union all select 'links',to_jsonb(t) from public.ledger_entry_tags t
union all select 'tags',to_jsonb(t) from public.ledger_tags t
union all select 'accounts',to_jsonb(t) from public.accounts t
union all select 'payments',to_jsonb(t) from public.payment_methods t
union all select 'requests',to_jsonb(t) from public.record_change_requests t;
commit;
begin;
\ir ../migrations/20261002063236_expand_ledger_books.sql
commit;
begin;
\ir ../migrations/20261002063302_install_ledger_books_backfill.sql
\ir ../migrations/20261002111422_atomic_ledger_writes.sql
commit;
-- Premature enforcement must fail; missing books must be visible to reconciliation.
do $$begin
  begin
    perform ledger_books_private.assert_reconciled(true);
    raise exception 'unexpected reconciliation success';
  exception when check_violation then assert sqlerrm='LEDGER_BACKFILL_INCOMPLETE'; end;
end $$;
-- Partial-stage historical resolution after the current default changes. Roll back
-- this intentional edit so the migration checkpoint still compares EVERY field.
begin;
select ledger_books_private.seed_household(pg_temp.sid('h'));
insert into public.ledger_books(household_id,name,visibility,created_by)
values(pg_temp.sid('h'),'Replacement','shared',pg_temp.sid('owner')) returning id as replacement \gset
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.sid('owner'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',pg_temp.sid('owner')::text,true);
select public.make_default_ledger_book(:'replacement');
do $$declare oldrow public.ledger_entries; newrow public.ledger_entries;begin
  select * into oldrow from public.write_ledger_entry('update',pg_temp.sid('owner'),'{"tags":["Keep"]}',pg_temp.sid('shared'));
  select * into newrow from public.write_ledger_entry('create',pg_temp.sid('owner'),jsonb_build_object('householdId',pg_temp.sid('h'),'type','expense','amount',1,'transactedAt','2026-01-01Z'));
  assert oldrow.book_id=(select id from public.ledger_books where household_id=pg_temp.sid('h') and created_by is null), 'old NULL shared remains original seed';
  assert newrow.book_id=(select id from public.ledger_books where household_id=pg_temp.sid('h') and is_default), 'new create uses replacement';
end $$;
rollback;
-- Backfill replay with three independently committed size-one batches.
begin; select public.backfill_ledger_books(1); commit;
begin; select public.backfill_ledger_books(1); commit;
begin; select public.backfill_ledger_books(1); commit;
begin; select public.backfill_ledger_books(1); commit;
begin;
do $$ begin
  assert public.backfill_ledger_books(1)=0, 'drained replay updates no entries';
  assert not exists(select 1 from public.households h where not exists(select 1 from public.ledger_books b where b.household_id=h.id and b.is_default)), 'empty households also seeded';
  assert (select count(*)=2 from public.ledger_books where household_id=pg_temp.sid('h')), 'exact shared and personal seeds';
  assert (select count(*)=3 and bool_and(b.visibility=case when e.is_shared then 'shared' else 'personal' end)
    from public.ledger_entries e join public.ledger_books b on e.book_id=b.id), 'all legacy rows mapped to matching visibility';
end $$;
create temporary table stage_after as
select 'entries' relation,to_jsonb(e)-'book_id' data from public.ledger_entries e
union all select 'links',to_jsonb(t) from public.ledger_entry_tags t
union all select 'tags',to_jsonb(t) from public.ledger_tags t
union all select 'accounts',to_jsonb(t) from public.accounts t
union all select 'payments',to_jsonb(t) from public.payment_methods t
union all select 'requests',to_jsonb(t) from public.record_change_requests t;
do $$begin
  assert not exists((select * from stage_before except all select * from stage_after)
    union all (select * from stage_after except all select * from stage_before)), 'exact records, refs, tags, balances and ALL original timestamps preserved';
end $$;
select ledger_books_private.assert_reconciled(true);
commit;
begin;
\ir ../migrations/20261002063304_validate_ledger_books.sql
commit;
begin;
\ir ../migrations/20261002063305_enforce_ledger_books_not_null.sql
commit;
\echo staged migration preservation and replay passed
