\timing on
select id as hid from households where big \gset
select id as l1 from ledgers where household_id=:'hid' and no=1 \gset
select id as l2 from ledgers where household_id=:'hid' and no=2 \gset
-- 워밍업 후 측정: 각 쿼리를 두 번 돌려 두 번째를 본다
\echo ===== F1 이번 달 수입·지출·남은 돈 (원 기록 달 귀속)
prepare f1 as
with mr as (
  select id, fx_rate from records
  where household_id=:'hid' and ledger_id in (:'l1',:'l2') and date >= '2026-10-01' and date < '2026-11-01'
    and status='confirmed' and not excluded_from_stats),
own as (
  select l.amount, l.currency, mr.fx_rate from lines l join mr on l.household_id=:'hid' and l.record_id=mr.id
  where l.role='general' or (l.role='benefit' and l.origin_record_id is null)),
ret as (
  select l.amount, l.currency, r.fx_rate from lines l
  join mr o on l.household_id=:'hid' and l.origin_record_id=o.id
  join records r on r.household_id=:'hid' and r.id=l.record_id and r.status='confirmed' and not r.excluded_from_stats)
select
  sum(case when amount>0 then krw end)::bigint income,
  (-sum(case when amount<0 then krw end) - coalesce((select sum(amount) from ret),0))::bigint spending
from (select amount, case when currency='USD' then round(amount*fx_rate/100) else amount end krw from own) t;
execute f1; execute f1;
explain (analyze, buffers, costs off, timing off, summary on) execute f1;

\echo ===== F2 카테고리별 지출, 최근 4개월 (이번 달 + 직전 3개월 평균용)
prepare f2 as
with mr as (
  select id, date, fx_rate from records
  where household_id=:'hid' and ledger_id in (:'l1',:'l2') and date >= '2026-07-01' and date < '2026-11-01'
    and status='confirmed' and not excluded_from_stats),
x as (
  select date_trunc('month',mr.date) m, l.category_id, l.amount from lines l join mr on l.household_id=:'hid' and l.record_id=mr.id
  where l.role='general' and l.amount<0
  union all
  select date_trunc('month',o.date), l.category_id, l.amount from lines l
  join mr o on l.household_id=:'hid' and l.origin_record_id=o.id
  join records r on r.household_id=:'hid' and r.id=l.record_id and r.status='confirmed' and not r.excluded_from_stats)
select m, category_id, -sum(amount) spent from x group by 1,2;
execute f2; execute f2;
explain (analyze, costs off, timing off, summary on) execute f2;

\echo ===== A1 지갑 잔액(전 기간 다리 합) + 묶음
prepare a1 as
select w.stats_group, w.id, lg.currency, lg.security_id, sum(lg.amount)::bigint amt, sum(lg.quantity) qty
from legs lg join wallets w on w.household_id=lg.household_id and w.id=lg.wallet_id
where lg.household_id=:'hid'
group by 1,2,3,4;
execute a1; execute a1;
explain (analyze, costs off, timing off, summary on) execute a1;

\echo ===== A2 월말 잔액 추이 24개월 (현금 다리 + 종목 수량 × 월말 종가 × 월말 환율)
prepare a2 as
with lg as (
  select lg.wallet_id, lg.currency, lg.security_id, lg.amount, lg.quantity, date_trunc('month', r.date)::date m
  from legs lg join records r on r.household_id=lg.household_id and r.id=lg.record_id
  where lg.household_id=:'hid'),
per_month as (
  select wallet_id, currency, security_id, m, sum(amount) amt, sum(quantity) qty from lg group by 1,2,3,4),
months as (select generate_series('2024-11-01'::date,'2026-10-01','1 month')::date m),
cum as (
  select mo.m, p.wallet_id, p.currency, p.security_id, sum(p.amt) amt, sum(p.qty) qty
  from months mo join per_month p on p.m <= mo.m group by 1,2,3,4),
val as (
  select c.m, c.wallet_id,
    case when c.security_id is null then
         case when c.currency='USD' then round(c.amt * fx.rate / 100) else c.amt end
    else round(c.qty * px.close * case when s.currency='USD' then fx.rate/100 else 1 end) end krw
  from cum c
  left join securities s on s.id=c.security_id
  left join lateral (select close from security_daily_closes d where d.security_id=c.security_id and d.date <= (c.m + interval '1 month' - interval '1 day')::date order by d.date desc limit 1) px on true
  left join lateral (select rate from fx_rates f where f.pair='USDKRW' and f.date <= (c.m + interval '1 month' - interval '1 day')::date order by f.date desc limit 1) fx on true)
select v.m, w.stats_group, sum(v.krw)::bigint from val v join wallets w on w.id=v.wallet_id group by 1,2 order by 1,2;
execute a2; execute a2;
explain (analyze, costs off, timing off, summary on) execute a2;

\echo ===== O1 가구원별 지출 (공용 장부, 결제한 사람: 덮어쓰기 > 결제수단 주인 > 함께 지갑 > 지갑 주인)
prepare o1 as
with mr as (
  select id, spender_member_id from records
  where household_id=:'hid' and ledger_id = :'l1' and date >= '2026-10-01' and date < '2026-11-01'
    and status='confirmed' and not excluded_from_stats),
payer as (
  select distinct on (mr.id) mr.id,
    coalesce(mr.spender_member_id, pm.owner_member_id, case when w.allow_member_use then null else w.owner_member_id end) who
  from mr join legs lg on lg.household_id=:'hid' and lg.record_id=mr.id and lg.amount<0 and not lg.is_exchange
  join wallets w on w.household_id=:'hid' and w.id=lg.wallet_id
  left join payment_methods pm on pm.household_id=:'hid' and pm.id=lg.payment_method_id
  order by mr.id, lg.amount)
select p.who, -sum(l.amount) from lines l join payer p on l.household_id=:'hid' and l.record_id=p.id
where l.role='general' and l.amount<0 group by 1;
execute o1; execute o1;
explain (analyze, costs off, timing off, summary on) execute o1;

\echo ===== O4 받을 돈 (예상 정산·혜택) - 인덱스 없음
prepare o4 as
select sum(l.amount) from records r join lines l on l.household_id=r.household_id and l.record_id=r.id
where r.household_id=:'hid' and r.ledger_id in (:'l1',:'l2') and r.status='expected';
execute o4; execute o4;
explain (analyze, costs off, timing off, summary on) execute o4;
