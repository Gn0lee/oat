-- 물리 DB 스키마(docs/design/physical-db-schema.md)에서 이관에 필요한 테이블만 옮긴 PoC 스키마. PostgreSQL 18.
-- 두 칸 FK, kind별 CHECK 일부, 줄 합 지연 트리거(3.3)를 그대로 둔다. RLS·롤·감사 기록은 뺐다.
\set ON_ERROR_STOP 1
create schema if not exists app;
set search_path = app, public;

create table households (id uuid primary key default uuidv7(), name text not null, created_at timestamptz not null default now());
create table users (id text primary key, email text not null unique, name text not null); -- Better Auth user 자리
create table household_members (
  id uuid primary key default uuidv7(), household_id uuid not null references households, user_id text references users,
  role text not null check (role in ('owner','member')), status text not null default 'active', display_name text not null,
  created_at timestamptz not null default now(), unique (household_id, id), unique (household_id, user_id));

create table ledgers (
  id uuid primary key default uuidv7(), household_id uuid not null references households,
  kind text not null check (kind in ('shared','personal')), owner_member_id uuid, name text not null,
  archived_at timestamptz,             -- 이관에서 더한 칸(기존 보관 장부)
  created_at timestamptz not null default now(), version int not null default 1,
  unique (household_id, id),
  foreign key (household_id, owner_member_id) references household_members (household_id, id),
  check ((kind = 'personal') = (owner_member_id is not null)));

create table wallets (
  id uuid primary key default uuidv7(), household_id uuid not null references households,
  kind text not null check (kind in ('bank','cash','credit_card','loan','pay_money','points','gift_card','brokerage')),
  name text not null, owner_member_id uuid not null, hidden_from_household boolean not null default false,
  allow_member_use boolean not null default false, archived_at timestamptz,
  stats_group text not null check (stats_group in ('spendable','saving','investment','points','liability')),
  created_at timestamptz not null default now(), version int not null default 1,
  unique (household_id, id),
  foreign key (household_id, owner_member_id) references household_members (household_id, id),
  check ((kind in ('credit_card','loan')) = (stats_group = 'liability')));

create table wallet_card_settings (
  household_id uuid not null, wallet_id uuid not null, issuer text, payment_day smallint check (payment_day between 1 and 31),
  effective_from date not null, primary key (wallet_id, effective_from),
  foreign key (household_id, wallet_id) references wallets (household_id, id) on delete cascade);

create table wallet_brokerage_settings (
  household_id uuid not null, wallet_id uuid primary key, ledger_id uuid not null,
  cash_tracking_enabled boolean not null default false, tax_type text not null default 'general' check (tax_type in ('general','isa','pension')),
  foreign key (household_id, wallet_id) references wallets (household_id, id) on delete cascade,
  foreign key (household_id, ledger_id) references ledgers (household_id, id));

create table payment_methods (
  id uuid primary key default uuidv7(), household_id uuid not null references households,
  kind text not null check (kind in ('credit_card','debit_card','pay')), name text not null, wallet_id uuid,
  owner_member_id uuid not null, archived_at timestamptz, created_at timestamptz not null default now(), version int not null default 1,
  unique (household_id, id), unique (household_id, id, wallet_id),
  foreign key (household_id, wallet_id) references wallets (household_id, id),
  foreign key (household_id, owner_member_id) references household_members (household_id, id));

create table categories (
  id uuid primary key default uuidv7(), household_id uuid not null references households,
  name text not null, flow text not null check (flow in ('income','expense')), parent_id uuid, system_key text,
  is_fixed_default boolean not null default false, ledger_id uuid, sort int not null default 0, icon text,
  created_at timestamptz not null default now(), version int not null default 1,
  unique (household_id, id), foreign key (household_id, parent_id) references categories (household_id, id));

create table securities (
  id uuid primary key default uuidv7(), market text not null, code text not null, name text not null,
  currency text not null, unique (market, code));

create table fx_rates (base text not null, quote text not null, rate_date date not null, rate numeric(18,6) not null,
  primary key (base, quote, rate_date));

create table records (
  id uuid primary key default uuidv7(), household_id uuid not null references households, ledger_id uuid not null,
  kind text not null check (kind in ('general','card_payment','refund','benefit','benefit_reversal','settlement','settlement_return',
    'expiry','balance_adjustment','trade','fx_exchange','security_transfer','security_transfer_out','security_transfer_in','corporate_action','dividend')),
  status text not null default 'confirmed' check (status in ('confirmed','expected')),
  date date not null, time time(0), sort_time time generated always as (coalesce(time, '24:00')) stored,
  title text, memo text, excluded_from_stats boolean not null default false,
  is_fixed boolean not null, spender_member_id uuid, payment_method_id uuid,
  fx_rate numeric(18,6), fx_rate_date date,
  created_at timestamptz not null default now(), version int not null default 1,
  unique (household_id, id),
  foreign key (household_id, ledger_id) references ledgers (household_id, id) on delete restrict,
  foreign key (household_id, spender_member_id) references household_members (household_id, id),
  foreign key (household_id, payment_method_id) references payment_methods (household_id, id));

create table legs (
  id uuid primary key default uuidv7(), household_id uuid not null, record_id uuid not null, wallet_id uuid not null,
  currency text check (currency ~ '^[A-Z]{3}$'), amount bigint check (amount <> 0 and abs(amount) <= 9007199254740991),
  security_id uuid references securities, quantity numeric(24,8) check (quantity <> 0), unit_price numeric,
  payment_method_id uuid, is_exchange boolean not null default false, is_estimated boolean not null default false,
  foreign key (household_id, record_id) references records (household_id, id) on delete cascade,
  foreign key (household_id, wallet_id) references wallets (household_id, id) on delete restrict,
  foreign key (household_id, payment_method_id, wallet_id) references payment_methods (household_id, id, wallet_id),
  check ((currency is not null and amount is not null and security_id is null and quantity is null)
      or (currency is null and amount is null and security_id is not null and quantity is not null)));

create table lines (
  id uuid primary key default uuidv7(), household_id uuid not null, record_id uuid not null,
  role text not null default 'general' check (role in ('general','refund','benefit','settlement','expiry')),
  currency text not null, amount bigint not null, category_id uuid, name text, list_price bigint,
  origin_record_id uuid, cost_type text, is_estimated boolean not null default false, sort int not null default 0,
  foreign key (household_id, record_id) references records (household_id, id) on delete cascade,
  foreign key (household_id, category_id) references categories (household_id, id) on delete restrict,
  check (origin_record_id is null or role in ('refund','benefit','settlement')));

create index on legs (household_id, wallet_id);
create index on records (household_id, ledger_id, date, sort_time, id);

-- 3.3 줄 합 불변식: 커밋 시점에 기록당 한 번
create or replace function check_record_sums() returns trigger language plpgsql as $$
declare rid uuid; r records; bad text; j jsonb := to_jsonb(coalesce(new, old));
begin
  rid := case when tg_table_name = 'records' then (j->>'id')::uuid else (j->>'record_id')::uuid end;
  select * into r from records where id = rid;
  if not found then return null; end if;  -- 지워진 기록
  if r.status = 'confirmed' then
    if not exists (select 1 from legs where record_id = rid) then raise exception 'RECORD_WITHOUT_LEGS %', rid; end if;
    select string_agg(cur, ',') into bad from (
      select cur from (
        select currency cur, amount from legs where record_id = rid and currency is not null and not is_exchange
        union all select currency, -amount from lines where record_id = rid) t
      group by cur having sum(amount) <> 0) x;
    if bad is not null and r.kind <> 'balance_adjustment' then raise exception 'LINE_SUM_MISMATCH record=% currency=%', rid, bad; end if;
    if r.kind = 'balance_adjustment' and exists (select 1 from lines where record_id = rid) then raise exception 'ADJUSTMENT_WITH_LINES %', rid; end if;
    if r.kind not in ('trade','fx_exchange') and exists (select 1 from legs where record_id = rid and is_exchange) then raise exception 'EXCHANGE_LEG_NOT_ALLOWED %', rid; end if;
    if r.kind not in ('trade','security_transfer','security_transfer_out','security_transfer_in','corporate_action','balance_adjustment')
       and exists (select 1 from legs where record_id = rid and security_id is not null) then raise exception 'SECURITY_LEG_NOT_ALLOWED %', rid; end if;
    if r.kind = 'trade' and not exists (
        select 1 from legs c join legs s on s.record_id = c.record_id and s.wallet_id = c.wallet_id
        where c.record_id = rid and c.is_exchange and c.currency is not null and s.is_exchange and s.security_id is not null
          and sign(c.amount) <> sign(s.quantity)) then raise exception 'TRADE_SHAPE %', rid; end if;
  else
    if exists (select 1 from legs where record_id = rid) then raise exception 'EXPECTED_WITH_LEGS %', rid; end if;
  end if;
  return null;
end $$;
create constraint trigger records_sum after insert or update on records deferrable initially deferred for each row execute function check_record_sums();
create constraint trigger legs_sum after insert or update or delete on legs deferrable initially deferred for each row execute function check_record_sums();
create constraint trigger lines_sum after insert or update or delete on lines deferrable initially deferred for each row execute function check_record_sums();
