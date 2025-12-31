# DATABASE.md

> Supabase PostgreSQL 스키마 설계

## TL;DR

- **transactions 테이블** - 모든 매수/매도 기록 저장
- **holdings View** - transactions 기반 현재 보유량 자동 집계
- **household_stock_settings** - 가구별 종목 설정 (자산유형, 위험도)
- **RLS 필수** - 모든 테이블에 Row Level Security, 가구 단위 데이터 격리
- **profiles.role** - user/admin 구분 (Admin UI는 MVP 이후)

---

## ERD 개요

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   profiles  │──────<│ household_members│>──────│ households  │
└─────────────┘       └──────────────────┘       └─────────────┘
       │                                                │
       ▼                                                │
┌─────────────┐                                         ▼
│ invitations │       ┌──────────────────────┐   ┌─────────────┐
└─────────────┘       │ household_stock_     │──<│transactions │
                      │ settings             │   └─────────────┘
                      └──────────────────────┘          │
                                                        ▼
┌─────────────┐       ┌─────────────┐           ┌─────────────┐
│    tags     │──────<│holding_tags │>─────────<│  holdings   │
└─────────────┘       └─────────────┘           │   (View)    │
                                                └─────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │ target_       │
                                                │ allocations   │
                                                └───────────────┘
```

---

## Enum 타입 정의

```sql
-- 사용자 역할
create type user_role as enum ('user', 'admin');

-- 가구 내 역할
create type household_role as enum ('owner', 'member');

-- 자산 유형
create type asset_type as enum (
  'equity',       -- 주식
  'bond',         -- 채권
  'cash',         -- 현금/예금
  'commodity',    -- 원자재 (금, 은)
  'crypto',       -- 암호화폐
  'alternative'   -- 기타 (리츠, 펀드 등)
);

-- 시장 구분
create type market_type as enum ('KR', 'US', 'OTHER');

-- 통화
create type currency_type as enum ('KRW', 'USD');

-- 위험도
create type risk_level as enum ('safe', 'moderate', 'aggressive');

-- 거래 유형
create type transaction_type as enum ('buy', 'sell');

-- 목표 비중 카테고리
create type allocation_category as enum (
  'equity_kr',
  'equity_us',
  'equity_other',
  'bond',
  'cash',
  'commodity',
  'crypto',
  'alternative'
);
```

---

## 테이블 정의

### 1. profiles (사용자 프로필)

Supabase Auth의 `auth.users`와 1:1 연결

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role user_role not null default 'user',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 트리거: Auth 유저 생성 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | auth.users.id 참조 |
| email | text | 이메일 |
| name | text | 표시 이름 |
| role | enum | user / admin |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

---

### 2. households (가구 그룹)

```sql
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리집',
  created_at timestamptz default now() not null
);
```

---

### 3. household_members (가구 구성원)

```sql
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role household_role not null default 'member',
  joined_at timestamptz default now() not null,
  
  primary key (household_id, user_id)
);

-- 인덱스
create index household_members_user_id_idx on public.household_members(user_id);
create index household_members_household_id_idx on public.household_members(household_id);
```

---

### 4. invitations (초대 코드)

```sql
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

-- 인덱스
create index invitations_code_idx on public.invitations(code);
create index invitations_household_id_idx on public.invitations(household_id);
```

---

### 5. household_stock_settings (가구별 종목 설정)

```sql
create table public.household_stock_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ticker text not null,
  name text not null,
  asset_type asset_type not null default 'equity',
  market market_type not null default 'KR',
  currency currency_type not null default 'KRW',
  risk_level risk_level,  -- null이면 asset_type 기본값 사용
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique (household_id, ticker)
);

-- 인덱스
create index household_stock_settings_household_id_idx 
  on public.household_stock_settings(household_id);
create index household_stock_settings_ticker_idx 
  on public.household_stock_settings(ticker);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| ticker | text | 종목 코드 |
| name | text | 종목명 |
| asset_type | enum | 자산 유형 |
| market | enum | 시장 구분 |
| currency | enum | 통화 |
| risk_level | enum (nullable) | 위험도 (null이면 기본값) |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

**risk_level 기본값 로직 (Application 레벨)**
```typescript
const DEFAULT_RISK_BY_TYPE: Record<AssetType, RiskLevel> = {
  equity: 'moderate',
  bond: 'safe',
  cash: 'safe',
  commodity: 'safe',
  crypto: 'aggressive',
  alternative: 'moderate',
};

function getRiskLevel(setting: HouseholdStockSetting): RiskLevel {
  return setting.risk_level ?? DEFAULT_RISK_BY_TYPE[setting.asset_type];
}
```

---

### 6. transactions (거래 기록)

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  ticker text not null,
  type transaction_type not null,
  quantity numeric(18, 8) not null check (quantity > 0),
  price numeric(18, 4) not null check (price >= 0),
  memo text,
  transacted_at timestamptz not null,  -- 실제 거래일
  created_at timestamptz default now() not null
);

-- 인덱스
create index transactions_household_id_idx on public.transactions(household_id);
create index transactions_owner_id_idx on public.transactions(owner_id);
create index transactions_ticker_idx on public.transactions(ticker);
create index transactions_transacted_at_idx on public.transactions(transacted_at);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 거래 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| owner_id | uuid (FK) | 거래 소유자 |
| ticker | text | 종목 코드 |
| type | enum | buy / sell |
| quantity | numeric(18,8) | 수량 |
| price | numeric(18,4) | 거래 단가 |
| memo | text (nullable) | 메모 |
| transacted_at | timestamptz | 실제 거래일 |
| created_at | timestamptz | 기록 생성일 |

---

### 7. holdings (현재 보유 현황 View)

```sql
create view public.holdings as
select
  t.household_id,
  t.owner_id,
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
group by 
  t.household_id, 
  t.owner_id, 
  t.ticker, 
  s.name, 
  s.asset_type, 
  s.market, 
  s.currency, 
  s.risk_level
having sum(case when t.type = 'buy' then t.quantity else -t.quantity end) > 0;
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| household_id | uuid | 소속 가구 |
| owner_id | uuid | 소유자 |
| ticker | text | 종목 코드 |
| name | text | 종목명 (settings에서) |
| asset_type | enum | 자산 유형 (settings에서) |
| market | enum | 시장 구분 (settings에서) |
| currency | enum | 통화 (settings에서) |
| risk_level | enum | 위험도 (settings에서) |
| quantity | numeric | 현재 보유 수량 |
| avg_price | numeric | 평균 매수가 |
| total_invested | numeric | 총 투자 금액 |
| first_transaction_at | timestamptz | 최초 거래일 |
| last_transaction_at | timestamptz | 최근 거래일 |

---

### 8. tags (사용자 정의 태그)

> MVP에서는 테이블만 생성, UI는 2단계에서 구현

```sql
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text default '#6B7280',
  created_at timestamptz default now() not null,
  
  unique(household_id, name)
);

-- 인덱스
create index tags_household_id_idx on public.tags(household_id);
```

---

### 9. holding_tags (보유종목-태그 연결)

```sql
create table public.holding_tags (
  household_id uuid not null,
  owner_id uuid not null,
  ticker text not null,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz default now() not null,
  
  primary key (household_id, owner_id, ticker, tag_id)
);

-- 인덱스
create index holding_tags_tag_id_idx on public.holding_tags(tag_id);
```

---

### 10. target_allocations (목표 비중)

```sql
create table public.target_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category allocation_category not null,
  target_percentage numeric(5, 2) not null 
    check (target_percentage >= 0 and target_percentage <= 100),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique(household_id, category)
);

-- 인덱스
create index target_allocations_household_id_idx on public.target_allocations(household_id);
```

---

## Row Level Security (RLS)

### 헬퍼 함수

```sql
-- 사용자가 속한 household_id 목록 조회
create or replace function get_user_household_ids()
returns setof uuid as $$
  select household_id 
  from public.household_members 
  where user_id = auth.uid()
$$ language sql security definer stable;

-- 사용자가 특정 가구의 멤버인지 확인
create or replace function is_household_member(hh_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh_id and user_id = auth.uid()
  )
$$ language sql security definer stable;

-- 사용자가 특정 가구의 owner인지 확인
create or replace function is_household_owner(hh_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh_id and user_id = auth.uid() and role = 'owner'
  )
$$ language sql security definer stable;

-- 사용자가 admin인지 확인
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$ language sql security definer stable;
```

### profiles

```sql
alter table public.profiles enable row level security;

-- 본인 프로필 조회
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 같은 가구 멤버 프로필 조회
create policy "Users can view household members"
  on public.profiles for select
  using (
    id in (
      select user_id from public.household_members
      where household_id in (select get_user_household_ids())
    )
  );

-- 본인 프로필 수정
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admin은 모든 프로필 조회 가능
create policy "Admins can view all profiles"
  on public.profiles for select
  using (is_admin());
```

### households

```sql
alter table public.households enable row level security;

create policy "Users can view own households"
  on public.households for select
  using (is_household_member(id));

create policy "Users can create household"
  on public.households for insert
  with check (true);

create policy "Owners can update household"
  on public.households for update
  using (is_household_owner(id));

create policy "Owners can delete household"
  on public.households for delete
  using (is_household_owner(id));

create policy "Admins can view all households"
  on public.households for select
  using (is_admin());
```

### household_members

```sql
alter table public.household_members enable row level security;

create policy "Users can view household members"
  on public.household_members for select
  using (is_household_member(household_id));

create policy "Owners can add members"
  on public.household_members for insert
  with check (is_household_owner(household_id) or user_id = auth.uid());

create policy "Owners can remove members or self"
  on public.household_members for delete
  using (is_household_owner(household_id) or user_id = auth.uid());
```

### household_stock_settings

```sql
alter table public.household_stock_settings enable row level security;

create policy "Users can view household stock settings"
  on public.household_stock_settings for select
  using (is_household_member(household_id));

create policy "Users can manage household stock settings"
  on public.household_stock_settings for all
  using (is_household_member(household_id));
```

### transactions

```sql
alter table public.transactions enable row level security;

create policy "Users can view household transactions"
  on public.transactions for select
  using (is_household_member(household_id));

create policy "Users can insert household transactions"
  on public.transactions for insert
  with check (is_household_member(household_id));

create policy "Users can update own transactions"
  on public.transactions for update
  using (is_household_member(household_id) and owner_id = auth.uid());

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (is_household_member(household_id) and owner_id = auth.uid());
```

### holdings (View)

```sql
-- View에는 직접 RLS 적용 불가
-- 대신 기반 테이블(transactions, household_stock_settings)의 RLS가 적용됨
```

### invitations

```sql
alter table public.invitations enable row level security;

create policy "Users can view household invitations"
  on public.invitations for select
  using (is_household_member(household_id));

create policy "Anyone can view invitation by code"
  on public.invitations for select
  using (true);

create policy "Users can create household invitations"
  on public.invitations for insert
  with check (is_household_member(household_id));
```

### tags

```sql
alter table public.tags enable row level security;

create policy "Users can view household tags"
  on public.tags for select
  using (is_household_member(household_id));

create policy "Users can manage household tags"
  on public.tags for all
  using (is_household_member(household_id));
```

### holding_tags

```sql
alter table public.holding_tags enable row level security;

create policy "Users can view household holding_tags"
  on public.holding_tags for select
  using (is_household_member(household_id));

create policy "Users can manage household holding_tags"
  on public.holding_tags for all
  using (is_household_member(household_id));
```

### target_allocations

```sql
alter table public.target_allocations enable row level security;

create policy "Users can view household targets"
  on public.target_allocations for select
  using (is_household_member(household_id));

create policy "Users can manage household targets"
  on public.target_allocations for all
  using (is_household_member(household_id));
```

---

## 데이터 흐름

### 거래 등록 플로우

```
1. 종목 검색 (API)
      ↓
2. household_stock_settings에 종목 없으면 자동 생성
      ↓
3. transactions에 거래 기록 INSERT
      ↓
4. holdings View에서 자동으로 최신 보유 현황 반영
```

### 조회 플로우

```
현재 보유 현황 → holdings View 조회
거래 내역     → transactions 테이블 조회
종목 설정     → household_stock_settings 조회
자산 추이     → transactions를 날짜별 집계
```

---

## TypeScript 타입 생성

```bash
pnpm supabase gen types typescript --local > types/supabase.ts
```

---

## 마이그레이션 파일 구조

```
supabase/
└── migrations/
    ├── 20240101000000_create_enums.sql
    ├── 20240101000001_create_households.sql
    ├── 20240101000002_create_profiles.sql
    ├── 20240101000003_create_household_members.sql
    ├── 20240101000004_create_invitations.sql
    ├── 20240101000005_create_household_stock_settings.sql
    ├── 20240101000006_create_transactions.sql
    ├── 20240101000007_create_holdings_view.sql
    ├── 20240101000008_create_tags.sql
    ├── 20240101000009_create_holding_tags.sql
    ├── 20240101000010_create_target_allocations.sql
    ├── 20240101000011_create_rls_helpers.sql
    └── 20240101000012_create_rls_policies.sql
```