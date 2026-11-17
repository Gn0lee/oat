select id as hid from households where big \gset
select id as l1 from ledgers where household_id=:'hid' and no=1 \gset
select id as l2 from ledgers where household_id=:'hid' and no=2 \gset
\echo ===== A2b 추이: 월별 합 -> 윈도 누적 (쿼리만 고침)
prepare a2b as
with pm as (
  select lg.wallet_id, lg.currency, lg.security_id, date_trunc('month', r.date)::date m, sum(lg.amount) amt, sum(lg.quantity) qty
  from legs lg join records r on r.household_id=lg.household_id and r.id=lg.record_id
  where lg.household_id=:'hid' group by 1,2,3,4),
cum as (
  select wallet_id, currency, security_id, m,
    sum(amt) over w amt, sum(qty) over w qty,
    lead(m) over (partition by wallet_id, currency, security_id order by m) next_m
  from pm window w as (partition by wallet_id, currency, security_id order by m)),
months as (select generate_series('2024-11-01'::date,'2026-10-01','1 month')::date m),
snap as (  -- 각 달 말에 유효한 누적값
  select mo.m, c.wallet_id, c.currency, c.security_id, c.amt, c.qty
  from months mo join cum c on c.m <= mo.m and (c.next_m is null or c.next_m > mo.m)),
val as (
  select s.m, s.wallet_id,
    case when s.security_id is null then case when s.currency='USD' then round(s.amt*fx.rate/100) else s.amt end
    else round(s.qty*px.close*case when sec.currency='USD' then fx.rate/100 else 1 end) end krw
  from snap s left join securities sec on sec.id=s.security_id
  left join lateral (select close from security_daily_closes d where d.security_id=s.security_id and d.date <= (s.m + interval '1 month - 1 day')::date order by d.date desc limit 1) px on s.security_id is not null
  left join lateral (select rate from fx_rates f where f.pair='USDKRW' and f.date <= (s.m + interval '1 month - 1 day')::date order by f.date desc limit 1) fx on true)
select v.m, w.stats_group, sum(v.krw)::bigint from val v join wallets w on w.id=v.wallet_id group by 1,2;
execute a2b; execute a2b;
explain (analyze, costs off, timing off, summary on) execute a2b;

\echo ===== A3 평단 재계산용 매매 다리 읽기 (계좌 3개 전체 이력, 정렬 키 순)
prepare a3 as
select lg.wallet_id, lg.security_id, lg.quantity, lg.unit_price, lg.amount, r.date, r.sort_time, r.id
from legs lg join records r on r.household_id=lg.household_id and r.id=lg.record_id
join wallets w on w.household_id=lg.household_id and w.id=lg.wallet_id and w.kind='brokerage'
where lg.household_id=:'hid' and lg.is_exchange order by lg.wallet_id, lg.security_id, r.date, r.sort_time, r.id;
execute a3; execute a3;
explain (analyze, costs off, timing off, summary on) execute a3;

\echo ===== O4b 받을 돈 + 부분 인덱스
create index if not exists records_expected_idx on records(household_id, ledger_id) where status='expected';
analyze records;
prepare o4b as
select sum(l.amount) from records r join lines l on l.household_id=r.household_id and l.record_id=r.id
where r.household_id=:'hid' and r.ledger_id in (:'l1',:'l2') and r.status='expected';
execute o4b; execute o4b;
explain (analyze, costs off, timing off, summary on) execute o4b;
