select setseed(0.509);
insert into households(n,big) values (109500,true);
insert into households(n,big) select 3000,false from generate_series(1,300);
insert into household_members(household_id,no) select h.id, m from households h, generate_series(1,2) m;
insert into ledgers(household_id,kind,owner_member_id,no)
  select h.id, case l when 1 then 'shared' else 'personal' end,
         case l when 1 then null else (select id from household_members where household_id=h.id and no=l-1) end, l
  from households h, generate_series(1,3) l;
-- 지갑 20개: 1 공동통장, 2-4 통장, 5 현금, 6-7 페이머니, 8-9 포인트, 10 상품권, 11-13 신용카드, 14 대출, 15-17 증권, 18 적금, 19-20 통장
insert into wallets(household_id,kind,stats_group,owner_member_id,allow_member_use,cash_tracking,no)
select h.id,
  case when w in (1,2,3,4,18,19,20) then 'bank' when w=5 then 'cash' when w in (6,7) then 'paymoney' when w in (8,9) then 'point'
       when w=10 then 'giftcard' when w between 11 and 13 then 'credit_card' when w=14 then 'loan' else 'brokerage' end,
  case when w in (1,2,3,4,5,6,7,19,20) then 'spendable' when w=18 then 'saving' when w in (8,9,10) then 'points'
       when w between 11 and 14 then 'liability' else 'investment' end,
  (select id from household_members where household_id=h.id and no=1+(w%2)), w=1, w<>17, w
from households h, generate_series(1,20) w;
-- 결제수단 1-6: 신용카드(11-13 지갑에 2장씩), 7-8: 공동통장 체크카드
insert into payment_methods(household_id,wallet_id,owner_member_id,no)
select h.id, (select id from wallets where household_id=h.id and no = case when p<=6 then 11+(p-1)/2 else 1 end),
       (select id from household_members where household_id=h.id and no=1+(p%2)), p
from households h, generate_series(1,8) p;
insert into categories(household_id,is_income,fixed_default,no) select h.id, c>40, c in (1,2,3), c from households h, generate_series(1,45) c;
insert into securities(currency,no) select case when s<=10 then 'USD' else 'KRW' end, s from generate_series(1,30) s;
insert into security_daily_closes select s.id, d::date, 10000+random()*1000
  from securities s, generate_series('2016-11-01'::date,'2026-11-17','1 day') d where extract(isodow from d)<6;
insert into fx_rates select 'USDKRW', d::date, 1100+random()*400 from generate_series('2016-11-01'::date,'2026-11-17','1 day') d;

-- 기록: 종류 비율 general 지출 83%, 수입 4%, 이체 4%, 카드대금 2%, 매매 2%, 돌려받은 돈 3%, 예상 정산 1%, 통계 제외 1%
create temp table g as
select h.id hid, s seq, ('2016-11-17'::date + (s::bigint*3650/h.n)::int) d, random() r, random() r2, random() r3
from households h, generate_series(1,h.n) s;
insert into records(household_id,ledger_id,kind,status,date,excluded_from_stats,payment_method_id,is_fixed,fx_rate,seq)
select g.hid,
  (select id from ledgers where household_id=g.hid and no = case when g.r2<0.7 then 1 when g.r2<0.85 then 2 else 3 end),
  case when r<0.83 then 'general_out' when r<0.87 then 'general_in' when r<0.91 then 'transfer' when r<0.93 then 'card_payment'
       when r<0.95 then 'trade' when r<0.96 then 'refund' when r<0.97 then 'benefit' when r<0.98 then 'settlement'
       when r<0.99 then 'settlement_expected' else 'excluded' end,
  case when r>=0.98 and r<0.99 then 'expected' else 'confirmed' end, d, r>=0.99,
  case when r<0.83 and r3<0.6 then (select id from payment_methods where household_id=g.hid and no=1+(seq%6))
       when r<0.83 and r3<0.8 then (select id from payment_methods where household_id=g.hid and no=7+(seq%2)) end,
  r<0.83 and r3>0.97, case when r>=0.93 and r<0.95 and r3<0.4 then 1300 end, seq
from g;
analyze;
