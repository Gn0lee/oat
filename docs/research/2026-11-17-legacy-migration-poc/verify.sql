-- 이관 결과 검증. 기존 화면이 보여주던 숫자(legacy.*)와 새 스키마에서 계산한 숫자를 비교한다.
\pset footer off
set search_path = app, public;

-- 평단(이동평균, 비용 제외)과 보유 수량을 정렬 키 순서로 계산한다. 음수가 되는 첫 지점도 낸다.
create or replace function pg_temp.positions()
returns table (wallet_id uuid, security_id uuid, qty numeric, avg_price numeric, first_negative_date date)
language plpgsql as $$
declare cur record; k text := ''; q numeric; cost numeric; neg date;
begin
  for cur in
    select lg.wallet_id w, lg.security_id s, lg.quantity dq, lg.unit_price up, r.kind, r.date
    from legs lg join records r on r.id = lg.record_id
    where lg.security_id is not null
    order by lg.wallet_id, lg.security_id, r.date, r.sort_time, r.id
  loop
    if k <> cur.w::text || '|' || cur.s::text then
      if k <> '' then wallet_id := split_part(k, '|', 1)::uuid; security_id := split_part(k, '|', 2)::uuid;
        qty := q; avg_price := case when q > 0 then round(cost / q, 6) end; first_negative_date := neg; return next; end if;
      k := cur.w::text || '|' || cur.s::text; q := 0; cost := 0; neg := null;
    end if;
    if cur.dq > 0 then cost := cost + cur.dq * coalesce(cur.up, 0);          -- 살 때만 평단이 바뀐다
    elsif q > 0 then cost := cost + cur.dq * (cost / q); end if;             -- 팔면 평단 그대로 원가만 줄인다
    q := q + cur.dq;
    if q < 0 and neg is null then neg := cur.date; end if;
    if q <= 0 then cost := 0; end if;
  end loop;
  if k <> '' then wallet_id := split_part(k, '|', 1)::uuid; security_id := split_part(k, '|', 2)::uuid;
    qty := q; avg_price := case when q > 0 then round(cost / q, 6) end; first_negative_date := neg; return next; end if;
end $$;

\echo '== V1 건수: 기존 → 새 기록'
select 'ledger_entries' src, count(*) legacy, (select count(*) from records r join mig.map m on m.new_id = r.id and m.src = 'entry') migrated from legacy.ledger_entries
union all select 'transactions', count(*), (select count(*) from records r join mig.map m on m.new_id = r.id and m.src = 'trade') from legacy.transactions
union all select 'balance_adjustments(≠0)', count(*) filter (where delta <> 0), (select count(*) from records r join mig.map m on m.new_id = r.id and m.src = 'adjustment') from legacy.balance_adjustments;

\echo '== V2 잔액을 관리하던 지갑(예수금 관리를 켠 증권 계좌 포함): 기존 저장 잔액 = 새 KRW 다리 합'
select w.name, w.kind, x.stored, coalesce(sum(lg.amount), 0) computed, x.stored = coalesce(sum(lg.amount), 0) ok
from (select mig.id('account', a.id) wid, a.balance stored from legacy.accounts a
        left join wallet_brokerage_settings bs on bs.wallet_id = mig.id('account', a.id)
        where a.balance is not null and coalesce(bs.cash_tracking_enabled, true)
      union all select mig.id('pm_wallet', id), balance from legacy.payment_methods where balance is not null) x
join wallets w on w.id = x.wid left join legs lg on lg.wallet_id = w.id and lg.currency = 'KRW'
group by w.name, w.kind, x.stored order by w.kind, w.name;

\echo '== V3 보유 수량: 기존 holdings 뷰 = 새 종목 다리 합'
select a.name account, h.ticker, h.quantity legacy_qty, p.qty new_qty, h.quantity = p.qty ok
from legacy.holdings h join legacy.accounts a on a.id = h.account_id
join securities s on s.code = h.ticker and s.market = h.market::text
join pg_temp.positions() p on p.wallet_id = mig.id('account', h.account_id) and p.security_id = s.id
order by 1, 2;
\echo '   (새 쪽에만 남은 0이 아닌 보유)'
select w.name, s.code, p.qty from pg_temp.positions() p join wallets w on w.id = p.wallet_id join securities s on s.id = p.security_id
where p.qty <> 0 and not exists (select 1 from legacy.holdings h where mig.id('account', h.account_id) = p.wallet_id and h.ticker = s.code);

\echo '== V4 평단: 기존(매수 총액 ÷ 매수 수량) vs 새(이동평균)'
select a.name account, h.ticker, round(h.avg_price, 4) legacy_avg, round(p.avg_price, 4) new_avg,
       round(h.avg_price, 4) = round(p.avg_price, 4) same,
       exists (select 1 from legacy.transactions t1 join legacy.transactions t2 on t2.account_id = t1.account_id and t2.ticker = t1.ticker
               where t1.account_id = h.account_id and t1.ticker = h.ticker and t1.type = 'sell' and t2.type = 'buy'
                 and (t2.transacted_at, t2.created_at) > (t1.transacted_at, t1.created_at)) as bought_after_sell
from legacy.holdings h join legacy.accounts a on a.id = h.account_id
join securities s on s.code = h.ticker and s.market = h.market::text
join pg_temp.positions() p on p.wallet_id = mig.id('account', h.account_id) and p.security_id = s.id order by 1, 2;

\echo '== V5 보유 수량 음수(정렬 키 순서로 다시 계산)'
select w.name, s.code, p.first_negative_date from pg_temp.positions() p join wallets w on w.id = p.wallet_id join securities s on s.id = p.security_id
where p.first_negative_date is not null;

\echo '== V6 장부별 월 수입·지출: 기존 통계(expense·income만) = 새 줄 합(통계 제외 빼고)'
with old as (
  select e.book_id, to_char(mig.kst_date(e.transacted_at), 'YYYY-MM') ym,
         sum(e.amount) filter (where e.type = 'income') income, sum(e.amount) filter (where e.type = 'expense') expense
  from legacy.ledger_entries e where e.type in ('income','expense') group by 1, 2),
new as (
  select r.ledger_id, to_char(r.date, 'YYYY-MM') ym,
         sum(l.amount) filter (where l.amount > 0) income, -sum(l.amount) filter (where l.amount < 0) expense
  from records r join lines l on l.record_id = r.id where not r.excluded_from_stats and r.status = 'confirmed' group by 1, 2)
select count(*) months,
       count(*) filter (where coalesce(o.income, 0) = coalesce(n.income, 0) and coalesce(o.expense, 0) = coalesce(n.expense, 0)) matched
from old o full join new n on n.ledger_id = mig.id('ledger', o.book_id) and n.ym = o.ym;

\echo '== V7 카테고리별 합(전 기간): 기존 = 새'
select count(*) categories, count(*) filter (where o.s = n.s) matched from
 (select category_id, sum(amount) s from legacy.ledger_entries where type in ('income','expense') group by 1) o
 full join (select category_id, sum(abs(amount)) s from lines l join records r on r.id = l.record_id where not r.excluded_from_stats group by 1) n
 on n.category_id = mig.id('category', o.category_id);

\echo '== V8 같은 날 순서: 기존 화면(created_at, id) = 새 정렬 키(date, sort_time, id)'
with o as (select mig.id('entry', id) rid, row_number() over (partition by book_id, mig.kst_date(transacted_at) order by created_at, id) rn from legacy.ledger_entries),
     n as (select r.id rid, row_number() over (partition by r.ledger_id, r.date order by r.date, r.sort_time, r.id) rn from records r
           where r.id in (select new_id from mig.map where src = 'entry'))
select count(*) records, count(*) filter (where o.rn = n.rn) same_position from o join n using (rid);
\echo '   UUIDv7 시각 = 원래 생성 시각(ms)'
select count(*) total, count(*) filter (where date_trunc('milliseconds', uuid_extract_timestamp(r.id)) = date_trunc('milliseconds', e.created_at)) exact
from legacy.ledger_entries e join records r on r.id = mig.id('entry', e.id);

\echo '== V2b 증권 계좌 예수금 관리'
select bs.cash_tracking_enabled, count(*) from wallet_brokerage_settings bs group by 1;

\echo '== V9 신용카드 지갑: 전환 시점 갚을 돈(직전 결제일 이전 결제일 이후 이용분)'
select w.name, sum(lg.amount) balance, count(*) filter (where r.kind = 'balance_adjustment') adjustments
from wallets w join legs lg on lg.wallet_id = w.id join records r on r.id = lg.record_id where w.kind = 'credit_card' group by w.name;

\echo '== V10 잔액을 관리하지 않던 지갑(실제 잔액 입력 필요), 출처 미지정 지갑'
select w.name, w.kind, w.archived_at is not null archived, coalesce(sum(lg.amount), 0) computed
from wallets w left join legs lg on lg.wallet_id = w.id
where w.id in (select (detail->>'wallet')::uuid from mig.report where item = 'untracked_wallet') or w.name = '출처 미지정(전환)'
group by 1, 2, 3;

\echo '== V11 보고 항목'
select item, count(*) from mig.report group by 1 order by 1;
