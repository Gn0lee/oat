select id as hid from households where big \gset
\echo ===== 요약 테이블 후보: 지갑 x 단위 x 월 변화량
create table if not exists wallet_month_deltas as
  select lg.household_id, lg.wallet_id, lg.currency, lg.security_id, date_trunc('month', r.date)::date m, sum(lg.amount)::bigint amt, sum(lg.quantity) qty
  from legs lg join records r on r.household_id=lg.household_id and r.id=lg.record_id group by 1,2,3,4,5;
create index if not exists wmd_idx on wallet_month_deltas(household_id, wallet_id, m);
analyze wallet_month_deltas;
select count(*) from wallet_month_deltas where household_id=:'hid';
prepare a2c as
with cum as (
  select wallet_id, currency, security_id, m, sum(amt) over w amt, sum(qty) over w qty,
    lead(m) over (partition by wallet_id, currency, security_id order by m) next_m
  from wallet_month_deltas where household_id=:'hid' window w as (partition by wallet_id, currency, security_id order by m)),
months as (select generate_series('2024-11-01'::date,'2026-10-01','1 month')::date m),
snap as (select mo.m, c.wallet_id, c.currency, c.security_id, c.amt, c.qty from months mo join cum c on c.m <= mo.m and (c.next_m is null or c.next_m > mo.m)),
val as (
  select s.m, s.wallet_id,
    case when s.security_id is null then case when s.currency='USD' then round(s.amt*fx.rate/100) else s.amt end
    else round(s.qty*px.close*case when sec.currency='USD' then fx.rate/100 else 1 end) end krw
  from snap s left join securities sec on sec.id=s.security_id
  left join lateral (select close from security_daily_closes d where d.security_id=s.security_id and d.date <= (s.m + interval '1 month - 1 day')::date order by d.date desc limit 1) px on s.security_id is not null
  left join lateral (select rate from fx_rates f where f.pair='USDKRW' and f.date <= (s.m + interval '1 month - 1 day')::date order by f.date desc limit 1) fx on true)
select v.m, w.stats_group, sum(v.krw)::bigint from val v join wallets w on w.id=v.wallet_id group by 1,2;
execute a2c; execute a2c;
explain (analyze, costs off, timing off, summary on) execute a2c;
\echo ===== 참고: 3년치(하루 30건)만 있는 가구라면 A2 원본은? 기간을 3년으로 잘라 측정
prepare a2d as
select lg.wallet_id, lg.currency, lg.security_id, date_trunc('month', r.date)::date m, sum(lg.amount), sum(lg.quantity)
from legs lg join records r on r.household_id=lg.household_id and r.id=lg.record_id
where lg.household_id=:'hid' and r.date >= '2023-11-17' group by 1,2,3,4;
execute a2d; execute a2d;
explain (analyze, costs off, timing off, summary on) execute a2d;
