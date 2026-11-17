-- 기존 가구 하나를 새 스키마로 옮긴다. 트랜잭션 하나 = 가구 하나(물리 스키마 2.2).
-- psql -v hh=<기존 household id> -v cutover=<이관 날짜 YYYY-MM-DD>
-- 규칙은 docs/design/legacy-migration.md.
\set ON_ERROR_STOP 1
begin;
set local search_path = app, public;
create temp table p on commit drop as select :'hh'::uuid as hh, :'cutover'::date as cutover;

-- 1. 가구·사용자·가구원 ------------------------------------------------------------
insert into mig.map select 'household', h.id, mig.v7(h.created_at) from legacy.households h, p where h.id = p.hh;
insert into households (id, name, created_at)
  select mig.id('household', h.id), h.name, h.created_at from legacy.households h, p where h.id = p.hh;

insert into users (id, email, name)
  select pr.id::text, pr.email, pr.name from legacy.profiles pr
  join legacy.household_members m on m.user_id = pr.id, p where m.household_id = p.hh
  on conflict (id) do nothing;

insert into mig.map select 'member', m.user_id, mig.v7(m.joined_at) from legacy.household_members m, p where m.household_id = p.hh;
insert into household_members (id, household_id, user_id, role, display_name, created_at)
  select mig.id('member', m.user_id), mig.id('household', p.hh), m.user_id::text, m.role::text, coalesce(nullif(pr.name, ''), pr.email), m.joined_at
  from legacy.household_members m join legacy.profiles pr on pr.id = m.user_id, p where m.household_id = p.hh;

create temp table hhid on commit drop as select mig.id('household', hh) as id from p;

-- 2. 장부 --------------------------------------------------------------------------
insert into mig.map select 'ledger', b.id, mig.v7(b.created_at) from legacy.ledger_books b, p where b.household_id = p.hh;
insert into ledgers (id, household_id, kind, owner_member_id, name, archived_at, created_at)
  select mig.id('ledger', b.id), (select id from hhid), b.visibility,
         case when b.visibility = 'personal' then mig.id('member', b.created_by) end, b.name, b.archived_at, b.created_at
  from legacy.ledger_books b, p where b.household_id = p.hh;
create temp table default_ledger on commit drop as
  select mig.id('ledger', b.id) as id from legacy.ledger_books b, p where b.household_id = p.hh and b.is_default;

-- 개인 장부: 잔액 맞춤을 넣을 곳(Q8). 보관하지 않은 가장 오래된 개인 장부, 없으면 만든다.
create temp table personal_ledger (member_id uuid primary key, ledger_id uuid) on commit drop;
insert into personal_ledger
  select distinct on (owner_member_id) owner_member_id, id from ledgers
  where household_id = (select id from hhid) and kind = 'personal' and archived_at is null
  order by owner_member_id, created_at;
with need as (
  select hm.id member_id, hm.display_name from household_members hm
  where hm.household_id = (select id from hhid) and hm.id not in (select member_id from personal_ledger)),
ins as (
  insert into ledgers (household_id, kind, owner_member_id, name)
  select (select id from hhid), 'personal', member_id, display_name || ' 개인' from need returning id, owner_member_id)
insert into personal_ledger select owner_member_id, id from ins;
insert into mig.report select (select id from hhid), 'created_personal_ledger', to_jsonb(l) from ledgers l
  where l.household_id = (select id from hhid) and l.id not in (select mig.id('ledger', b.id) from legacy.ledger_books b, p where b.household_id = p.hh);

-- 3. 카테고리(가구 행 그대로, 고정비 기본값은 모두 끔 Q5) ---------------------------------
insert into mig.map select 'category', c.id, mig.v7(c.created_at) from legacy.categories c, p where c.household_id = p.hh;
insert into categories (id, household_id, name, flow, parent_id, icon, sort, is_fixed_default, created_at)
  select mig.id('category', c.id), (select id from hhid), c.name, c.type::text, mig.id('category', c.parent_id), c.icon, c.display_order, false, c.created_at
  from legacy.categories c, p where c.household_id = p.hh
  order by c.parent_id nulls first;

-- 4. 지갑: 계좌 ----------------------------------------------------------------------
create temp table acc on commit drop as
  select a.*, (a.category = 'investment' or a.account_type in ('stock','isa','pension')
               or exists (select 1 from legacy.transactions t where t.account_id = a.id)) as is_brokerage
  from legacy.accounts a, p where a.household_id = p.hh;
insert into mig.map select 'account', id, mig.v7(created_at) from acc;
insert into wallets (id, household_id, kind, name, owner_member_id, allow_member_use, stats_group, created_at)
  select mig.id('account', id), (select id from hhid), case when is_brokerage then 'brokerage' else 'bank' end, name,
         mig.id('member', owner_id), is_household_usable,
         case when is_brokerage then 'investment' when account_type in ('savings','deposit') then 'saving' else 'spendable' end, created_at
  from acc;
insert into wallet_brokerage_settings (household_id, wallet_id, ledger_id, cash_tracking_enabled, tax_type)
  select (select id from hhid), mig.id('account', id), (select id from default_ledger), false,
         case account_type when 'isa' then 'isa' when 'pension' then 'pension' else 'general' end
  from acc where is_brokerage;

-- 5. 지갑: 잔액을 가진 결제수단(선불·상품권·현금) ---------------------------------------------
create temp table pm on commit drop as select * from legacy.payment_methods pm, p where pm.household_id = p.hh;
insert into mig.map select 'pm_wallet', id, mig.v7(created_at) from pm where type in ('prepaid','gift_card','cash');
insert into wallets (id, household_id, kind, name, owner_member_id, allow_member_use, stats_group, created_at)
  select mig.id('pm_wallet', id), (select id from hhid),
         case type when 'prepaid' then 'pay_money' when 'gift_card' then 'gift_card' else 'cash' end, name,
         mig.id('member', owner_id), is_household_usable,
         case type when 'gift_card' then 'points' else 'spendable' end, created_at
  from pm where type in ('prepaid','gift_card','cash');

-- 6. 신용카드: 주인 × 카드사 × 결제일로 묶은 지갑 + 카드마다 결제수단 -------------------------------
create temp table card_group on commit drop as
  select pm.id pm_id,
         case when pm.payment_day is null then pm.id::text
              else pm.owner_id::text || '|' || coalesce(pm.issuer, '') || '|' || pm.payment_day end as gkey
  from pm where type = 'credit_card';
create temp table card_wallet on commit drop as
  select g.gkey, mig.v7(min(pm.created_at)) as wallet_id, min(pm.owner_id::text)::uuid owner_id, max(pm.issuer) issuer,
         max(pm.payment_day) payment_day, bool_or(pm.is_household_usable) usable, min(pm.created_at) created_at,
         count(*) cards, min(pm.name) one_name
  from card_group g join pm on pm.id = g.pm_id group by g.gkey;
insert into wallets (id, household_id, kind, name, owner_member_id, allow_member_use, stats_group, created_at)
  select wallet_id, (select id from hhid), 'credit_card',
         case when payment_day is null or cards = 1 then one_name else coalesce(issuer, '카드') || ' ' || payment_day || '일 결제' end,
         mig.id('member', owner_id), usable, 'liability', created_at
  from card_wallet;
insert into wallet_card_settings (household_id, wallet_id, issuer, payment_day, effective_from)
  select (select id from hhid), wallet_id, issuer, payment_day, mig.kst_date(created_at) from card_wallet;

-- 7. 출처 미지정 지갑(Q3): 결제 방법 없는 지출·수입, 연결 통장 없는 체크카드가 있는 가구원만 ----------------
create temp table unassigned on commit drop as
  select distinct owner_id from (
    select e.owner_id from legacy.ledger_entries e, p where e.household_id = p.hh
      and ((e.type in ('expense','non_expense_withdrawal') and e.from_account_id is null and e.from_payment_method_id is null)
        or (e.type = 'income' and e.to_account_id is null and e.to_payment_method_id is null))
    union all select owner_id from pm where type = 'debit_card' and linked_account_id is null) x;
insert into mig.map select 'unassigned', owner_id, uuidv7() from unassigned;
insert into wallets (id, household_id, kind, name, owner_member_id, archived_at, stats_group)
  select mig.id('unassigned', owner_id), (select id from hhid), 'cash', '출처 미지정(전환)', mig.id('member', owner_id), now(), 'spendable'
  from unassigned;
insert into mig.report select (select id from hhid), 'created_unassigned_wallet', jsonb_build_object('member', mig.id('member', owner_id)) from unassigned;

-- 8. 체크카드·신용카드 결제수단 --------------------------------------------------------------
insert into mig.map select 'pm', id, mig.v7(created_at) from pm where type in ('credit_card','debit_card');
insert into payment_methods (id, household_id, kind, name, wallet_id, owner_member_id, created_at)
  select mig.id('pm', pm.id), (select id from hhid), pm.type::text, pm.name,
         case when pm.type = 'credit_card' then cw.wallet_id
              when pm.linked_account_id is not null then mig.id('account', pm.linked_account_id)
              else mig.id('unassigned', pm.owner_id) end,
         mig.id('member', pm.owner_id), pm.created_at
  from pm left join card_group g on g.pm_id = pm.id left join card_wallet cw on cw.gkey = g.gkey
  where pm.type in ('credit_card','debit_card');

-- 기존 출처(계좌 또는 결제수단) → (지갑, 다리의 결제수단)
create temp table src on commit drop as
  select 'account' t, id lid, mig.id('account', id) wallet_id, null::uuid pm_id from acc
  union all select 'pm', pm.id, coalesce(mig.id('pm_wallet', pm.id), np.wallet_id), case when pm.type in ('credit_card','debit_card') then np.id end
  from pm left join payment_methods np on np.id = mig.id('pm', pm.id);

-- 9. 가계부 기록 ---------------------------------------------------------------------------
create temp table e on commit drop as select le.* from legacy.ledger_entries le, p where le.household_id = p.hh;
insert into mig.map select 'entry', id, mig.v7(created_at) from e;

insert into records (id, household_id, ledger_id, kind, date, title, memo, excluded_from_stats, is_fixed, payment_method_id, created_at)
  select mig.id('entry', e.id), (select id from hhid), mig.id('ledger', e.book_id), 'general', mig.kst_date(e.transacted_at),
         e.title, e.memo, e.type = 'non_expense_withdrawal', false,
         case when e.type in ('expense','non_expense_withdrawal') then (select pm_id from src where t = 'pm' and lid = e.from_payment_method_id) end,
         e.created_at
  from e;

-- 나가는 다리(지출·비지출 출금·이체 출발)
insert into legs (household_id, record_id, wallet_id, currency, amount, payment_method_id)
  select (select id from hhid), mig.id('entry', e.id),
         coalesce(s.wallet_id, mig.id('unassigned', e.owner_id)), 'KRW', -mig.round_away(e.amount), s.pm_id
  from e left join src s on (s.t = 'account' and s.lid = e.from_account_id) or (s.t = 'pm' and s.lid = e.from_payment_method_id)
  where e.type in ('expense','non_expense_withdrawal','transfer');
-- 들어오는 다리(수입·이체 도착)
insert into legs (household_id, record_id, wallet_id, currency, amount, payment_method_id)
  select (select id from hhid), mig.id('entry', e.id),
         coalesce(s.wallet_id, mig.id('unassigned', e.owner_id)), 'KRW', mig.round_away(e.amount), null
  from e left join src s on (s.t = 'account' and s.lid = e.to_account_id) or (s.t = 'pm' and s.lid = e.to_payment_method_id)
  where e.type in ('income','transfer');
-- 줄 하나(이체는 줄 없음). 비지출 출금은 미분류 + 통계 제외(Q1).
insert into lines (household_id, record_id, currency, amount, category_id)
  select (select id from hhid), mig.id('entry', e.id), 'KRW',
         case when e.type = 'income' then 1 else -1 end * mig.round_away(e.amount), mig.id('category', e.category_id)
  from e where e.type <> 'transfer';
insert into mig.report select (select id from hhid), 'fractional_amount', jsonb_build_object('entry', e.id, 'amount', e.amount) from e where e.amount <> round(e.amount);

-- 쓴 사람(Q6): 공용 장부의 나간 기록에서, 계산값이 특정 가구원이고 기존 작성자와 다를 때만 저장
update records r set spender_member_id = x.owner_member
from (
  select r.id, mig.id('member', e.owner_id) owner_member,
         case when lg.payment_method_id is not null then pmn.owner_member_id
              when w.allow_member_use then null else w.owner_member_id end as computed
  from e join records r on r.id = mig.id('entry', e.id)
  join ledgers l on l.id = r.ledger_id and l.kind = 'shared'
  join legs lg on lg.record_id = r.id and lg.amount < 0
  join wallets w on w.id = lg.wallet_id
  left join payment_methods pmn on pmn.id = lg.payment_method_id
  where e.type in ('expense','non_expense_withdrawal')) x
where r.id = x.id and x.computed is not null and x.computed <> x.owner_member;

-- 10. 기존 잔액 맞춤 → 잔액 맞춤 기록(지갑 주인의 개인 장부 Q8) -------------------------------------
create temp table ba on commit drop as select b.* from legacy.balance_adjustments b, p where b.household_id = p.hh and b.delta <> 0;
insert into mig.map select 'adjustment', id, mig.v7(created_at) from ba;
create temp table ba_w on commit drop as
  select ba.*, coalesce(mig.id('account', ba.account_id), (select wallet_id from src where t = 'pm' and lid = ba.payment_method_id)) wallet_id from ba;
insert into records (id, household_id, ledger_id, kind, date, title, memo, is_fixed, created_at)
  select mig.id('adjustment', b.id), (select id from hhid), pl.ledger_id, 'balance_adjustment', mig.kst_date(b.adjusted_at), b.title, b.memo, false, b.created_at
  from ba_w b join wallets w on w.id = b.wallet_id join personal_ledger pl on pl.member_id = w.owner_member_id;
insert into legs (household_id, record_id, wallet_id, currency, amount)
  select (select id from hhid), mig.id('adjustment', b.id), b.wallet_id, 'KRW', mig.round_away(b.delta) from ba_w b;

-- 11. 주식 거래 → 매매 -----------------------------------------------------------------------
insert into securities (market, code, name, currency)
  select s.market::text, s.ticker, s.name, s.currency::text from legacy.household_stock_settings s, p where s.household_id = p.hh
  on conflict (market, code) do nothing;
create temp table tr on commit drop as
  select t.*, s.currency::text cur, sec.id security_id, mig.kst_date(t.transacted_at) d
  from legacy.transactions t join legacy.household_stock_settings s on s.household_id = t.household_id and s.ticker = t.ticker
  join securities sec on sec.market = s.market::text and sec.code = t.ticker, p
  where t.household_id = p.hh;
-- 정렬 순서(날짜 → 입력 순서)로 보유 수량이 음수가 되는 (계좌, 종목, 날짜) 묶음은 그날 매수를 매도보다 앞에 둔다(Q9).
-- UUIDv7 시각만 그 묶음의 가장 이른 입력 시각 직전으로 당기고, 화면에 보이는 값은 바꾸지 않는다.
alter table tr add column ord_ts timestamptz;
update tr set ord_ts = created_at;
create temp table neg_day on commit drop as
  select distinct account_id, ticker, d from (
    select account_id, ticker, d, sum(case when type = 'buy' then quantity else -quantity end)
           over (partition by account_id, ticker order by d, created_at) cum from tr) x where cum < 0;
update tr set ord_ts = g.first_ts - (g.nbuy - x.rk + 1) * interval '1 millisecond'
from (select account_id, ticker, d, min(created_at) first_ts, count(*) filter (where type = 'buy') nbuy from tr group by 1, 2, 3) g,
     (select id, row_number() over (partition by account_id, ticker, d order by created_at) rk from tr where type = 'buy') x
where tr.type = 'buy' and x.id = tr.id and (g.account_id, g.ticker, g.d) = (tr.account_id, tr.ticker, tr.d)
  and (tr.account_id, tr.ticker, tr.d) in (select account_id, ticker, d from neg_day);
insert into mig.report select (select id from hhid), 'reordered_same_day_buy', jsonb_build_object('trade', id, 'date', d)
  from tr where ord_ts <> created_at;
-- 그래도 음수면(다른 날짜에 걸친 입력 오류) 이 가구는 이관하지 않는다. 기존 앱에서 날짜를 고친 뒤 다시 돌린다.
do $$
declare bad text;
begin
  select string_agg(distinct account_id || ':' || ticker || '@' || d, ', ') into bad from (
    select account_id, ticker, d, sum(case when type = 'buy' then quantity else -quantity end)
           over (partition by account_id, ticker order by d, ord_ts) cum from tr) x where cum < 0;
  if bad is not null then raise exception 'NEGATIVE_HOLDING_HISTORY %', bad; end if;
  if exists (select 1 from tr where price = 0 and type = 'sell') then raise exception 'ZERO_PRICE_SELL'; end if;
end $$;
insert into mig.map select 'trade', id, mig.v7(ord_ts) from tr;
insert into records (id, household_id, ledger_id, kind, date, memo, is_fixed, fx_rate, fx_rate_date, created_at)
  select mig.id('trade', tr.id), (select id from hhid), bs.ledger_id,
         case when tr.price = 0 then 'balance_adjustment' else 'trade' end,   -- 0원 매수: 종목 시작 보유(현금 다리 없음)
         tr.d, tr.memo, false, fx.rate, fx.rate_date, tr.created_at
  from tr join wallet_brokerage_settings bs on bs.wallet_id = mig.id('account', tr.account_id)
  left join lateral (select rate, rate_date from fx_rates where tr.cur <> 'KRW' and base = tr.cur and quote = 'KRW' and rate_date <= tr.d
                     order by rate_date desc limit 1) fx on true;
-- 현금 교환 다리: 체결 금액을 통화 최소 단위에서 절댓값 사사오입
insert into legs (household_id, record_id, wallet_id, currency, amount, is_exchange)
  select (select id from hhid), mig.id('trade', tr.id), mig.id('account', tr.account_id), tr.cur,
         case when tr.type = 'buy' then -1 else 1 end * mig.round_away(tr.quantity * tr.price * power(10::numeric, mig.minor_digits(tr.cur))), true
  from tr where tr.price <> 0;
-- 종목 다리: 체결 단가를 함께 저장(평단은 단가 × 수량으로 계산)
insert into legs (household_id, record_id, wallet_id, security_id, quantity, unit_price, is_exchange)
  select (select id from hhid), mig.id('trade', tr.id), mig.id('account', tr.account_id), tr.security_id,
         case when tr.type = 'buy' then tr.quantity else -tr.quantity end, tr.price, tr.price <> 0
  from tr;
insert into mig.report select (select id from hhid), 'zero_price_trade', jsonb_build_object('trade', tr.id, 'type', tr.type) from tr where tr.price = 0;
insert into mig.report select (select id from hhid), 'usd_trade_without_fx', jsonb_build_object('trade', tr.id) from tr
  join records r on r.id = mig.id('trade', tr.id) where tr.cur <> 'KRW' and r.fx_rate is null;

-- 12. 시작 잔액 맞춤: 잔액을 관리하던 지갑만, 저장 잔액 − 옮긴 다리 합 ----------------------------------
create temp table tracked on commit drop as
  select mig.id('account', a.id) wallet_id, a.balance stored, a.created_at from acc a where not a.is_brokerage and a.balance is not null
  union all select mig.id('pm_wallet', pm.id), pm.balance, pm.created_at from pm where pm.type in ('prepaid','gift_card','cash') and pm.balance is not null;
create temp table opening on commit drop as
  select t.wallet_id, mig.round_away(t.stored) - coalesce(sum(lg.amount), 0) diff,
         least(mig.kst_date(t.created_at), min(r.date)) d, least(t.created_at, min(r.created_at)) - interval '1 second' ts
  from tracked t left join legs lg on lg.wallet_id = t.wallet_id left join records r on r.id = lg.record_id
  group by t.wallet_id, t.stored, t.created_at;
insert into mig.map select 'opening', wallet_id, mig.v7(ts) from opening where diff <> 0;
insert into records (id, household_id, ledger_id, kind, date, title, is_fixed, created_at)
  select mig.id('opening', o.wallet_id), (select id from hhid), pl.ledger_id, 'balance_adjustment', o.d, '시작 잔액(전환)', false, o.ts
  from opening o join wallets w on w.id = o.wallet_id join personal_ledger pl on pl.member_id = w.owner_member_id where o.diff <> 0;
insert into legs (household_id, record_id, wallet_id, currency, amount)
  select (select id from hhid), mig.id('opening', wallet_id), wallet_id, 'KRW', diff from opening where diff <> 0;
insert into mig.report select (select id from hhid), 'untracked_wallet', jsonb_build_object('wallet', mig.id('account', a.id), 'name', a.name)
  from acc a where not a.is_brokerage and a.balance is null;

-- 13. 신용카드 결제일 맞춤(Q1): 결제일마다 직전 결제일 이후의 카드 다리 합을 0으로 되돌린다 -----------------
create temp table card_legs on commit drop as
  select cw.wallet_id, cw.payment_day, r.date, lg.amount from card_wallet cw join legs lg on lg.wallet_id = cw.wallet_id join records r on r.id = lg.record_id;
create temp table bill_dates on commit drop as
  select cw.wallet_id, b.d from card_wallet cw
  cross join lateral (select distinct
      least(make_date(extract(year from m)::int, extract(month from m)::int, 1) + (coalesce(cw.payment_day, 31) - 1),
            (date_trunc('month', m) + interval '1 month - 1 day')::date) d
    from generate_series(date_trunc('month', (select min(date) from card_legs c where c.wallet_id = cw.wallet_id)),
                         (select cutover from p), interval '1 month') m) b
  where b.d <= (select cutover from p);
create temp table card_adj on commit drop as
  select b.wallet_id, b.d, -coalesce((select sum(c.amount) from card_legs c where c.wallet_id = b.wallet_id and c.date <= b.d
      and c.date > coalesce((select max(b2.d) from bill_dates b2 where b2.wallet_id = b.wallet_id and b2.d < b.d), '-infinity')), 0) amount,
    uuidv7() id
  from bill_dates b;
insert into records (id, household_id, ledger_id, kind, date, title, is_fixed)
  select ca.id, (select id from hhid), pl.ledger_id, 'balance_adjustment', ca.d, '카드대금 맞춤(전환)', false
  from card_adj ca join wallets w on w.id = ca.wallet_id join personal_ledger pl on pl.member_id = w.owner_member_id where ca.amount <> 0;
insert into legs (household_id, record_id, wallet_id, currency, amount)
  select (select id from hhid), id, wallet_id, 'KRW', amount from card_adj where amount <> 0;

commit;  -- 줄 합 지연 트리거가 여기서 기록마다 돈다
