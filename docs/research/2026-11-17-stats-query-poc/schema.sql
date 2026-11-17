-- 509 통계 PoC: physical-db-schema.md에서 통계 쿼리에 필요한 칸만 옮긴 축약 스키마
create table households(id uuid primary key default uuidv7(), n int, big boolean);
create table household_members(id uuid primary key default uuidv7(), household_id uuid not null, no int);
create table ledgers(id uuid primary key default uuidv7(), household_id uuid not null, kind text, owner_member_id uuid, no int, unique(household_id,id));
create table wallets(id uuid primary key default uuidv7(), household_id uuid not null, kind text, stats_group text, owner_member_id uuid, allow_member_use bool default false, cash_tracking bool default true, no int, unique(household_id,id));
create table payment_methods(id uuid primary key default uuidv7(), household_id uuid not null, wallet_id uuid, owner_member_id uuid, no int, unique(household_id,id));
create table categories(id uuid primary key default uuidv7(), household_id uuid not null, is_income bool, fixed_default bool default false, no int, unique(household_id,id));
create table securities(id uuid primary key default uuidv7(), currency text, no int);
create table security_daily_closes(security_id uuid, date date, close numeric, primary key(security_id,date));
create table fx_rates(pair text, date date, rate numeric(18,6), primary key(pair,date));
create table records(
  id uuid primary key default uuidv7(), household_id uuid not null, ledger_id uuid not null,
  kind text not null, status text not null default 'confirmed', date date not null, time time(0),
  sort_time time not null generated always as (coalesce(time,'24:00')) stored,
  excluded_from_stats bool not null default false, payment_method_id uuid, recurring_rule_id uuid,
  is_fixed bool not null default false, spender_member_id uuid, fx_rate numeric(18,6), seq int,
  unique(household_id,id),
  foreign key(household_id,ledger_id) references ledgers(household_id,id));
create table legs(
  id uuid primary key default uuidv7(), household_id uuid not null, record_id uuid not null, wallet_id uuid not null,
  currency text, amount bigint, security_id uuid, quantity numeric(24,8), unit_price numeric,
  payment_method_id uuid, is_exchange bool not null default false,
  foreign key(household_id,record_id) references records(household_id,id) on delete cascade,
  foreign key(household_id,wallet_id) references wallets(household_id,id));
create table lines(
  id uuid primary key default uuidv7(), household_id uuid not null, record_id uuid not null,
  role text not null, currency text not null, amount bigint not null, category_id uuid,
  list_price bigint, origin_record_id uuid,
  foreign key(household_id,record_id) references records(household_id,id) on delete cascade,
  foreign key(household_id,origin_record_id) references records(household_id,id));
