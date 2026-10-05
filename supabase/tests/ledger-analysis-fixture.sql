\set ON_ERROR_STOP on
-- #446 analysis consistency fixture: two households x two users with shared,
-- personal, archived and empty books. Scratch DBs only; never production.
-- Requires users a1/a2/b1/b2@oat.test created through GoTrue first.
do $$ begin
  if current_database() !~ '^oat_ledger_books_[0-9a-z_]+_test$' then
    raise exception 'refusing to seed %: scratch test databases only', current_database();
  end if;
end $$;
begin;
create temp table ids(k text primary key, v uuid);
insert into ids select 'a1', id from auth.users where email='a1@oat.test';
insert into ids select 'a2', id from auth.users where email='a2@oat.test';
insert into ids select 'b1', id from auth.users where email='b1@oat.test';
insert into ids select 'b2', id from auth.users where email='b2@oat.test';
insert into ids select 'HA', household_id from household_members where user_id=(select v from ids where k='a1');
insert into ids select 'HB', household_id from household_members where user_id=(select v from ids where k='b1');
-- a2/b2 join the a1/b1 households as members.
create temp table gone as select household_id from household_members where user_id in ((select v from ids where k='a2'),(select v from ids where k='b2'));
delete from household_members where household_id in (select household_id from gone);
delete from households where id in (select household_id from gone);
insert into household_members(household_id,user_id,role) values ((select v from ids where k='HA'),(select v from ids where k='a2'),'member'),((select v from ids where k='HB'),(select v from ids where k='b2'),'member');

insert into ids select 'LIV', id from ledger_books where household_id=(select v from ids where k='HA') and is_default;
insert into ids select 'LIVB', id from ledger_books where household_id=(select v from ids where k='HB') and is_default;
insert into ledger_books(id,household_id,name,visibility,created_by) values
 ('00000000-0000-4000-8000-0000000000a1',(select v from ids where k='HA'),'여행','shared',(select v from ids where k='a1')),
 ('00000000-0000-4000-8000-0000000000a2',(select v from ids where k='HA'),'이사','shared',(select v from ids where k='a2')),
 ('00000000-0000-4000-8000-0000000000a3',(select v from ids where k='HA'),'a1 개인','personal',(select v from ids where k='a1')),
 ('00000000-0000-4000-8000-0000000000a4',(select v from ids where k='HA'),'a2 개인','personal',(select v from ids where k='a2')),
 ('00000000-0000-4000-8000-0000000000b3',(select v from ids where k='HB'),'b2 개인','personal',(select v from ids where k='b2'));

insert into accounts(id,household_id,owner_id,name,is_household_usable) values
 ('00000000-0000-4000-8000-00000000ac01',(select v from ids where k='HA'),(select v from ids where k='a1'),'a1 통장',true),
 ('00000000-0000-4000-8000-00000000ac02',(select v from ids where k='HA'),(select v from ids where k='a1'),'a1 페이',true);
insert into payment_methods(id,household_id,owner_id,name,type,is_household_usable) values
 ('00000000-0000-4000-8000-00000000cc01',(select v from ids where k='HA'),(select v from ids where k='a1'),'생활 카드','credit_card',true);

create temp table cat as
 select household_id, type::text, row_number() over (partition by household_id, type order by display_order, name) n, id
 from categories where parent_id is null;
create function pg_temp.c(h text, t text, n int) returns uuid language sql as $$ select id from cat where household_id=(select v from ids where k=h) and type=t and n=$3 $$;
create function pg_temp.u(k text) returns uuid language sql as $$ select v from ids where ids.k=$1 $$;

insert into ledger_entries(id,household_id,owner_id,book_id,type,amount,category_id,from_account_id,from_payment_method_id,to_account_id,title,transacted_at) values
 ('00000000-0000-4000-8000-0000000e0001',pg_temp.u('HA'),pg_temp.u('a1'),pg_temp.u('LIV'),'expense',10000,pg_temp.c('HA','expense',1),null,'00000000-0000-4000-8000-00000000cc01',null,'자정 직후 장보기','2026-09-30T15:30:00Z'),
 ('00000000-0000-4000-8000-0000000e0002',pg_temp.u('HA'),pg_temp.u('a2'),pg_temp.u('LIV'),'expense',20000,pg_temp.c('HA','expense',2),null,null,null,'외식','2026-10-05T03:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0003',pg_temp.u('HA'),pg_temp.u('a2'),'00000000-0000-4000-8000-0000000000a1','expense',5000,pg_temp.c('HA','expense',1),null,null,null,'여행 간식','2026-10-02T03:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0004',pg_temp.u('HA'),pg_temp.u('a1'),'00000000-0000-4000-8000-0000000000a3','expense',7000,pg_temp.c('HA','expense',1),null,'00000000-0000-4000-8000-00000000cc01',null,'a1 개인 점심','2026-10-05T04:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0005',pg_temp.u('HA'),pg_temp.u('a2'),'00000000-0000-4000-8000-0000000000a4','expense',9000,pg_temp.c('HA','expense',2),null,null,null,'a2 개인 선물','2026-10-06T04:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0006',pg_temp.u('HA'),pg_temp.u('a1'),pg_temp.u('LIV'),'income',100000,pg_temp.c('HA','income',1),null,null,'00000000-0000-4000-8000-00000000ac01','월급','2026-10-03T00:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0007',pg_temp.u('HA'),pg_temp.u('a1'),pg_temp.u('LIV'),'transfer',50000,null,'00000000-0000-4000-8000-00000000ac01',null,'00000000-0000-4000-8000-00000000ac02','페이 충전','2026-10-03T01:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0008',pg_temp.u('HA'),pg_temp.u('a1'),'00000000-0000-4000-8000-0000000000a3','non_expense_withdrawal',3000,null,'00000000-0000-4000-8000-00000000ac01',null,null,'현금 인출','2026-10-04T01:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0009',pg_temp.u('HA'),pg_temp.u('a1'),pg_temp.u('LIV'),'expense',999,pg_temp.c('HA','expense',1),null,null,null,'9월 말일 밤','2026-09-30T14:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0010',pg_temp.u('HB'),pg_temp.u('b1'),pg_temp.u('LIVB'),'expense',4000,pg_temp.c('HB','expense',1),null,null,null,'B 공용','2026-10-04T03:00:00Z'),
 ('00000000-0000-4000-8000-0000000e0011',pg_temp.u('HB'),pg_temp.u('b2'),'00000000-0000-4000-8000-0000000000b3','expense',6000,pg_temp.c('HB','expense',1),null,null,null,'B 개인','2026-10-04T04:00:00Z');
update ledger_books set archived_at = now() where id='00000000-0000-4000-8000-0000000000a1';
commit;
select b.name, b.visibility, b.archived_at is not null archived, count(e.id) from ledger_books b left join ledger_entries e on e.book_id=b.id where b.household_id in (select household_id from household_members hm join profiles p on p.id=hm.user_id where p.email like '%@oat.test') group by 1,2,3 order by 1;
