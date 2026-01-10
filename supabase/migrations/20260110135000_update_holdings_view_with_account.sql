-- holdings View 수정 - 계좌별 집계 지원
-- 이슈: #110

-- 기존 View 삭제
drop view if exists public.holdings;

-- 계좌 정보가 포함된 새 View 생성
create view public.holdings
with (security_invoker = on) as
select
  t.household_id,
  t.owner_id,
  t.account_id,
  a.name as account_name,
  t.ticker,
  s.name,
  s.asset_type,
  s.market,
  s.currency,
  s.risk_level,
  -- 현재 보유 수량
  sum(case when t.type = 'buy' then t.quantity else -t.quantity end) as quantity,
  -- 평균 매수가 (매수 거래만 계산)
  case
    when sum(case when t.type = 'buy' then t.quantity else 0 end) > 0
    then sum(case when t.type = 'buy' then t.quantity * t.price else 0 end) /
         sum(case when t.type = 'buy' then t.quantity else 0 end)
    else 0
  end as avg_price,
  -- 총 매수 금액
  sum(case when t.type = 'buy' then t.quantity * t.price else 0 end) as total_invested,
  -- 최초 거래일
  min(t.transacted_at) as first_transaction_at,
  -- 최근 거래일
  max(t.transacted_at) as last_transaction_at
from public.transactions t
join public.household_stock_settings s
  on t.household_id = s.household_id and t.ticker = s.ticker
left join public.accounts a
  on t.account_id = a.id
group by
  t.household_id,
  t.owner_id,
  t.account_id,
  a.name,
  t.ticker,
  s.name,
  s.asset_type,
  s.market,
  s.currency,
  s.risk_level
having sum(case when t.type = 'buy' then t.quantity else -t.quantity end) > 0;
