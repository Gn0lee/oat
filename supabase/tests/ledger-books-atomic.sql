-- Scratch-only, after staged migrations; all fixtures and injected failures roll back.
-- docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_440_test < supabase/tests/ledger-books-atomic.sql
\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts=on;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$begin assert current_database() ~ '^oat_ledger_books_[0-9a-z_]+_test$','scratch only'; end $$;
create temporary table ids as select key,gen_random_uuid() id from unnest(array[
 'owner','peer','outsider','new','lateowner','h','other','a','b','untracked','peerbank',
 'cash','prepaid','gift_card','credit_card','debit_card','unlinked','usabledebit','foreign','category'
]) keys(key);
grant select on ids to authenticated,service_role;
create function pg_temp.id(k text) returns uuid language sql stable as $$select id from ids where key=k$$;
create function pg_temp.actor(k text) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claim.sub',pg_temp.id(k)::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id(k),'role','authenticated')::text,true);
end $$;
-- Full snapshots include timestamps and tag names as well as money and entries.
create function pg_temp.snapshot() returns jsonb language sql security definer as $$
 select jsonb_object_agg(relation,data) from (
 select 'entries' relation,coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') data from public.ledger_entries t
 union all select 'accounts',coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.accounts t
 union all select 'payments',coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.payment_methods t
 union all select 'tags',coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.ledger_tags t
 union all select 'links',coalesce(jsonb_agg(to_jsonb(t) order by ledger_entry_id,tag_id),'[]') from public.ledger_entry_tags t
 union all select 'books',coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.ledger_books t
 union all select 'households',coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.households t
 union all select 'members',coalesce(jsonb_agg(to_jsonb(t) order by household_id,user_id),'[]') from public.household_members t
 ) s
$$;
create function pg_temp.reject(sql text,expected text) returns void language plpgsql as $$
declare before jsonb:=pg_temp.snapshot(); rejected boolean:=false;
begin
 begin execute sql; exception when raise_exception then
  assert sqlerrm=expected,format('expected %s, got %s',expected,sqlerrm); rejected:=true;
 end;
 assert rejected,'unexpected RPC success: '||sql;
 assert pg_temp.snapshot()=before,'failed RPC changed persisted state';
 raise notice 'ok rejection and full rollback: %',expected;
end $$;
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users(id,email) select id,key||'@440-atomic.invalid' from ids where key in ('owner','peer','outsider','new','lateowner');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles(id,email,name) select id,key||'@440-atomic.invalid',key from ids where key in ('owner','peer','outsider','new','lateowner');
insert into public.households(id,name) values(pg_temp.id('h'),'440 atomic'),(pg_temp.id('other'),'440 foreign');
insert into public.household_members(household_id,user_id,role) values
(pg_temp.id('h'),pg_temp.id('owner'),'owner'),(pg_temp.id('h'),pg_temp.id('peer'),'member'),(pg_temp.id('other'),pg_temp.id('outsider'),'owner');
insert into public.accounts(id,household_id,owner_id,name,balance) select id,
 case when key='foreign' then pg_temp.id('other') else pg_temp.id('h') end,
 case when key='foreign' then pg_temp.id('outsider') when key='peerbank' then pg_temp.id('peer') else pg_temp.id('owner') end,
 key,case when key='untracked' then null else 100 end from ids where key in ('a','b','untracked','peerbank','foreign');
insert into public.payment_methods(id,household_id,owner_id,name,type,balance,linked_account_id,is_household_usable)
select id,pg_temp.id('h'),case when key='usabledebit' then pg_temp.id('peer') else pg_temp.id('owner') end,key,
 case when key in ('unlinked','usabledebit') then 'debit_card' else key end::public.payment_method_type,
 case when key='cash' then null else 100 end,
 case when key='debit_card' then pg_temp.id('a') when key='usabledebit' then pg_temp.id('peerbank') end,key='usabledebit'
from ids where key in ('cash','prepaid','gift_card','credit_card','debit_card','unlinked','usabledebit');
insert into public.categories(id,household_id,name,type) values(pg_temp.id('category'),pg_temp.id('other'),'foreign','expense');
-- #446: every create names its book. Resolve the seeded shared default and an
-- owner personal book while still privileged.
insert into ids select 'book_shared',id from public.ledger_books where household_id=pg_temp.id('h') and is_default;
insert into ids values('book_personal',gen_random_uuid());
insert into public.ledger_books(id,household_id,name,visibility,created_by)
values(pg_temp.id('book_personal'),pg_temp.id('h'),'owner 개인','personal',pg_temp.id('owner'));
set local role authenticated;
select pg_temp.actor('owner');
do $$declare h uuid;begin
 perform pg_temp.reject(format('select public.create_household_with_owner(%L)',pg_temp.id('peer')),'AUTH_UNAUTHORIZED');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)', 'create',pg_temp.id('peer'),'{}'),'AUTH_UNAUTHORIZED');
 assert public.create_household_with_owner(pg_temp.id('owner'))=pg_temp.id('h'),'existing membership reused';
 perform pg_temp.actor('new'); h:=public.create_household_with_owner(pg_temp.id('new'),'  New home  ');
 assert public.create_household_with_owner(pg_temp.id('new'))=h,'idempotent household';
 assert (select count(*)=1 from public.household_members where household_id=h and user_id=pg_temp.id('new') and role='owner'),'owner membership';
 assert (select count(*)=1 from public.ledger_books where household_id=h and is_default and visibility='shared' and archived_at is null),'one seeded default';
 perform pg_temp.actor('outsider');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('outsider'),jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_shared'),'type','expense','amount',1,'transactedAt','2026-01-01Z')),'LEDGER_FORBIDDEN');
 perform pg_temp.actor('owner');
end $$;
reset role;
-- Force failures after the intended writes; assertions prove the failure is late.
create function pg_temp.late_member() returns trigger language plpgsql as $$begin
 if new.user_id=pg_temp.id('lateowner') then
  assert exists(select 1 from public.households where id=new.household_id);
  assert exists(select 1 from public.ledger_books where household_id=new.household_id and is_default);
  raise exception 'TEST_LATE_MEMBER';
 end if; return new;
end $$;
create trigger test_late_member after insert on public.household_members for each row execute function pg_temp.late_member();
create function pg_temp.late_tag() returns trigger language plpgsql as $$begin
 if exists(select 1 from public.ledger_tags where id=new.tag_id and name='LateFail') then
  assert exists(select 1 from public.ledger_entries where id=new.ledger_entry_id and title='late rollback');
  assert (select balance=93 from public.accounts where id=pg_temp.id('a')),'money written before tag failure';
  assert exists(select 1 from public.ledger_entry_tags where ledger_entry_id=new.ledger_entry_id and tag_id=new.tag_id);
  raise exception 'TEST_LATE_TAG';
 end if; return new;
end $$;
create trigger test_late_tag after insert on public.ledger_entry_tags for each row execute function pg_temp.late_tag();
create function pg_temp.late_money() returns trigger language plpgsql as $$begin
 if new.id=pg_temp.id('a') and new.balance=93 and exists(select 1 from public.ledger_entries where title='late money') then
  assert exists(select 1 from public.ledger_entries where title='late money');
  raise exception using errcode='23514',message='TEST_LATE_MONEY';
 end if; return new;
end $$;
create trigger test_late_money after update on public.accounts for each row execute function pg_temp.late_money();
set local role authenticated;
select pg_temp.actor('lateowner');
select pg_temp.reject(format('select public.create_household_with_owner(%L)',pg_temp.id('lateowner')),'TEST_LATE_MEMBER');
select pg_temp.actor('owner');
do $$declare p jsonb; patch jsonb;begin
 p:=jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_shared'),'type','expense','amount',7,'transactedAt','2026-01-01Z','fromAccountId',pg_temp.id('a'),'title','late rollback','tags',jsonb_build_array('Keep','LateFail'));
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),p),'TEST_LATE_TAG');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),p||'{"title":"late money"}'),'LEDGER_VALIDATION_ERROR');
 for patch in select value from jsonb_array_elements(jsonb_build_array(
 '{"amount":0}'::jsonb,'{"amount":"NaN"}'::jsonb,'{"transactedAt":"infinity"}'::jsonb,
 jsonb_build_object('fromAccountId',pg_temp.id('a'),'fromPaymentMethodId',pg_temp.id('cash')),
 jsonb_build_object('categoryId',pg_temp.id('category')))) loop
  perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),(p-'tags')||patch),'LEDGER_VALIDATION_ERROR');
 end loop;
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),(p-'tags')||jsonb_build_object('fromAccountId',pg_temp.id('foreign'))),'LEDGER_INVALID_TRANSFER_TARGET');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),(p-'tags')||jsonb_build_object('fromAccountId',pg_temp.id('peerbank'))),'LEDGER_FINANCIAL_SOURCE_FORBIDDEN');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),p||'{"tags":["bad-name"]}'),'LEDGER_TAG_INVALID_NAME');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),p||'{"tags":["a","b","c","d","e","f"]}'),'LEDGER_TAG_LIMIT_EXCEEDED');
end $$;
-- Observable effects, rather than a copy of the RPC's effect calculation.
create temporary table cases(label text,payload jsonb,a numeric,b numeric,cash numeric,prepaid numeric,gift numeric,peerbank numeric);
insert into cases values
 ('account expense',jsonb_build_object('type','expense','fromAccountId',pg_temp.id('a')),-10,0,0,0,0,0),
 ('account income',jsonb_build_object('type','income','toAccountId',pg_temp.id('a')),10,0,0,0,0,0),
 ('withdrawal',jsonb_build_object('type','non_expense_withdrawal','fromAccountId',pg_temp.id('a')),-10,0,0,0,0,0),
 ('cash expense',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('cash')),0,0,-10,0,0,0),
 ('prepaid income',jsonb_build_object('type','income','toPaymentMethodId',pg_temp.id('prepaid')),0,0,0,10,0,0),
 ('gift expense',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('gift_card')),0,0,0,0,-10,0),
 ('debit expense',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('debit_card')),-10,0,0,0,0,0),
 ('usable debit',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('usabledebit')),0,0,0,0,0,-10),
 ('unlinked debit',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('unlinked')),0,0,0,0,0,0),
 ('credit',jsonb_build_object('type','expense','fromPaymentMethodId',pg_temp.id('credit_card')),0,0,0,0,0,0),
 ('untracked',jsonb_build_object('type','expense','fromAccountId',pg_temp.id('untracked')),0,0,0,0,0,0),
 ('no endpoint','{"type":"expense"}',0,0,0,0,0,0),
 ('account transfer',jsonb_build_object('type','transfer','fromAccountId',pg_temp.id('a'),'toAccountId',pg_temp.id('b')),-10,10,0,0,0,0),
 ('account to cash',jsonb_build_object('type','transfer','fromAccountId',pg_temp.id('a'),'toPaymentMethodId',pg_temp.id('cash')),-10,0,10,0,0,0),
 ('cash to account',jsonb_build_object('type','transfer','fromPaymentMethodId',pg_temp.id('cash'),'toAccountId',pg_temp.id('a')),10,0,-10,0,0,0),
 ('aux transfer',jsonb_build_object('type','transfer','fromPaymentMethodId',pg_temp.id('cash'),'toPaymentMethodId',pg_temp.id('prepaid')),0,0,-10,10,0,0);
create function pg_temp.balances() returns numeric[] language sql as $$select array[
 (select balance from public.accounts where id=pg_temp.id('a')),
 (select balance from public.accounts where id=pg_temp.id('b')),
 (select coalesce(balance,0) from public.payment_methods where id=pg_temp.id('cash')),
 (select balance from public.payment_methods where id=pg_temp.id('prepaid')),
 (select balance from public.payment_methods where id=pg_temp.id('gift_card')),
 (select balance from public.accounts where id=pg_temp.id('peerbank'))]$$;
do $$declare c record; e public.ledger_entries; base numeric[]; effects numeric[]; factor integer; j integer;begin
 for c in select * from cases loop
  base:=pg_temp.balances(); effects:=array[c.a,c.b,c.cash,c.prepaid,c.gift,c.peerbank];
  select * into e from public.write_ledger_entry('create',pg_temp.id('owner'),c.payload||jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_shared'),'amount',10,'transactedAt','2026-01-01Z','tags',jsonb_build_array(U&'\00A0# Keep\FEFF','keep')));
  assert (select count(*)=1 from public.ledger_entry_tags where ledger_entry_id=e.id),'normalized Unicode tags deduplicated';
  for factor in 1..2 loop
   if factor=2 then
    if e.type='transfer' then
     perform public.write_ledger_entry('update',pg_temp.id('owner'),'{"tags":["edited"]}',e.id);
     perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L,%L)','update',pg_temp.id('owner'),'{"amount":20}',e.id),'LEDGER_TRANSFER_EDIT_UNSUPPORTED');
     exit;
    else perform public.write_ledger_entry('update',pg_temp.id('owner'),'{"amount":20}',e.id); end if;
   end if;
   for j in 1..6 loop assert (pg_temp.balances())[j]=base[j]+factor*effects[j],c.label||' balance create/edit'; end loop;
   assert (select balance is null from public.accounts where id=pg_temp.id('untracked')),'NULL account stays untracked';
  end loop;
  perform public.write_ledger_entry('delete',pg_temp.id('owner'),'{}',e.id);
  assert pg_temp.balances()=base,c.label||' delete reversal';
  assert not exists(select 1 from public.ledger_entry_tags where ledger_entry_id=e.id),'delete cascades links';
  raise notice 'ok symmetry: %',c.label;
 end loop;
end $$;
-- Reversal uses old type; own delete survives source permission revocation.
do $$declare e public.ledger_entries; private_entry public.ledger_entries; before jsonb;begin
 select * into e from public.write_ledger_entry('create',pg_temp.id('owner'),jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_shared'),'type','expense','amount',10,'transactedAt','2026-01-01Z','fromPaymentMethodId',pg_temp.id('debit_card')));
 perform public.write_ledger_entry('update',pg_temp.id('owner'),'{"type":"non_expense_withdrawal"}',e.id);
 assert (select balance=100 from public.accounts where id=pg_temp.id('a')),'debit expense reversed on type change';
 perform public.write_ledger_entry('delete',pg_temp.id('owner'),'{}',e.id);
 select * into private_entry from public.write_ledger_entry('create',pg_temp.id('owner'),jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_personal'),'type','expense','amount',10,'transactedAt','2026-01-01Z','fromAccountId',pg_temp.id('a')));
 perform pg_temp.actor('peer');
 assert not exists(select 1 from public.ledger_entries where id=private_entry.id),'private hidden under RLS';
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L,%L)','update',pg_temp.id('peer'),'{}',private_entry.id),'LEDGER_NOT_FOUND');
 perform pg_temp.actor('outsider');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L,%L)','delete',pg_temp.id('outsider'),'{}',private_entry.id),'LEDGER_NOT_FOUND');
 perform pg_temp.actor('owner');
 update public.ledger_books set archived_at=now() where id=private_entry.book_id;
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L,%L)','update',pg_temp.id('owner'),'{"tags":["edit"]}',private_entry.id),'LEDGER_BOOK_ARCHIVED');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L,%L)','delete',pg_temp.id('owner'),'{}',private_entry.id),'LEDGER_BOOK_ARCHIVED');
 perform pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('owner'),jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_personal'),'type','expense','amount',1,'transactedAt','2026-01-01Z')),'LEDGER_BOOK_ARCHIVED');
 update public.ledger_books set archived_at=null where id=private_entry.book_id;
 execute 'reset role'; update public.accounts set owner_id=pg_temp.id('peer') where id=pg_temp.id('a'); execute 'set local role authenticated';
 perform public.write_ledger_entry('update',pg_temp.id('owner'),'{"tags":["stilleditable"]}',private_entry.id);
 perform public.write_ledger_entry('delete',pg_temp.id('owner'),'{}',private_entry.id);
 assert (select balance=100 from public.accounts where id=pg_temp.id('a')),'own delete reverses revoked source';
end $$;
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select pg_temp.reject(format('select public.create_household_with_owner(%L)',gen_random_uuid()),'AUTH_UNAUTHORIZED');
select pg_temp.reject(format('select public.write_ledger_entry(%L,%L,%L)','create',pg_temp.id('outsider'),jsonb_build_object('householdId',pg_temp.id('h'),'bookId',pg_temp.id('book_shared'),'type','expense','amount',1,'transactedAt','2026-01-01Z')),'LEDGER_FORBIDDEN');
reset role;
set constraints all immediate;
rollback;
\echo atomic actor, privacy, rollback and balance regression passed
