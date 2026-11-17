select setseed(0.1509);
create temp table rr as
select r.id, r.household_id hid, r.kind, r.seq, r.payment_method_id pm, r.fx_rate,
  (random()*99000+1000)::bigint amt, random() x, random() y,
  (select no from payment_methods p where p.id=r.payment_method_id) pmno
from records r;
create temp table wm as select household_id hid, no, id from wallets;
create temp table cm as select household_id hid, no, id from categories;
create temp table sm as select no, id, currency from securities;
-- legs
insert into legs(household_id,record_id,wallet_id,currency,amount,payment_method_id)
select rr.hid, rr.id,
  (select id from wm where wm.hid=rr.hid and wm.no = case when pmno<=6 then 11+(pmno-1)/2 when pmno in (7,8) then 1 when x<0.5 then 2 else 6 end),
  'KRW', -amt, pm
from rr where kind in ('general_out','excluded');
insert into legs(household_id,record_id,wallet_id,currency,amount)
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=case when kind='general_in' then 2 else 3 end),'KRW', amt*(case when kind='general_in' then 30 else 1 end)/(case when kind='general_in' then 1 else 3 end)
from rr where kind in ('general_in','refund','benefit','settlement');
insert into legs(household_id,record_id,wallet_id,currency,amount)
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=case when kind='transfer' then (case when x<0.3 then 14 when x<0.6 then 18 else 1 end) else 11+(seq%3) end),'KRW', amt*5
from rr where kind in ('transfer','card_payment')
union all
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=2),'KRW', -amt*5 from rr where kind in ('transfer','card_payment');
-- 매매: 현금 교환 다리, 종목 교환 다리, 비용 다리
insert into legs(household_id,record_id,wallet_id,currency,amount,security_id,quantity,unit_price,is_exchange)
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=15+(seq%3)),
  case when fx_rate is null then 'KRW' else 'USD' end, case when y<0.7 then -amt*10 else amt*10 end, null,null,null,true from rr where kind='trade'
union all
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=15+(seq%3)), null,null,
  (select id from sm where sm.no = case when fx_rate is null then 11+(seq%20) else 1+(seq%10) end),
  case when y<0.7 then 10 else -3 end, 10000, true from rr where kind='trade'
union all
select hid,id,(select id from wm where wm.hid=rr.hid and wm.no=15+(seq%3)), case when fx_rate is null then 'KRW' else 'USD' end, -(amt/100+1),null,null,null,false from rr where kind='trade';
-- lines
insert into lines(household_id,record_id,role,currency,amount,category_id,list_price)
select hid,id,'general','KRW', -amt, (select id from cm where cm.hid=rr.hid and cm.no=1+(seq%40)), case when y<0.1 then amt*11/10 end
from rr where kind in ('general_out','excluded');
insert into lines(household_id,record_id,role,currency,amount,category_id)
select hid,id,'general','KRW', amt*30, (select id from cm where cm.hid=rr.hid and cm.no=41+(seq%5)) from rr where kind='general_in';
insert into lines(household_id,record_id,role,currency,amount,category_id)
select hid,id,'general', case when fx_rate is null then 'KRW' else 'USD' end, -(amt/100+1), (select id from cm where cm.hid=rr.hid and cm.no=40) from rr where kind='trade';
-- 돌려받은 돈: 같은 가구의 30~1800 seq 앞 지출 기록을 원 기록으로
insert into lines(household_id,record_id,role,currency,amount,category_id,origin_record_id)
select rr.hid, rr.id, case rr.kind when 'refund' then 'refund' when 'benefit' then 'benefit' else 'settlement' end, 'KRW',
  case when rr.kind='settlement_expected' then rr.amt/3 else rr.amt/3 end,
  (select id from cm where cm.hid=rr.hid and cm.no=1+(o.seq%40)), o.id
from rr join lateral (select id, seq from records o where o.household_id=rr.hid and o.seq = greatest(1, rr.seq - (30 + (rr.x*1770)::int)) ) o on true
where rr.kind in ('refund','benefit','settlement','settlement_expected');
