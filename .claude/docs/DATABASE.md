# DATABASE.md

> Supabase PostgreSQL 스키마 설계

## TL;DR

- **transactions 테이블** - 모든 매수/매도 기록 저장
- **holdings View** - transactions 기반 현재 보유량 자동 집계
- **household_stock_settings** - 가구별 종목 설정 (자산유형, 위험도)
- **stock_master** - 종목 기본 정보 (KIS 마스터파일 기반, 일 1회 동기화)
- **stock_prices** - 주식 가격 캐시 (KIS API 조회, 1시간 버킷 캐싱)
- **exchange_rates** - 환율 정보 (일 1회 동기화)
- **RLS 필수** - 모든 테이블에 Row Level Security, 가구 단위 데이터 격리
- **profiles.role** - user/admin 구분 (Admin UI는 MVP 이후)

---

## ERD 개요

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   profiles  │──────<│ household_members│>──────│ households  │
└─────────────┘       └──────────────────┘       └─────────────┘
       │                                                │
       ├──────────────────────────────────────────────┐ │
       ▼                                              ▼ ▼
┌─────────────┐       ┌─────────────┐         ┌─────────────┐
│ invitations │       │  accounts   │────────>│transactions │
└─────────────┘       └─────────────┘         └─────────────┘
                             │                        │
                             │         ┌──────────────────────┐
                             │         │ household_stock_     │────┘
                             │         │ settings             │
                             │         └──────────────────────┘
                             │                        │
                             ▼                        ▼
                      ┌──────────────┐        ┌─────────────┐
                      │ payment_     │        │  holdings   │
                      │ methods      │        │   (View)    │
                      └──────────────┘        └─────────────┘
                             │
                             ▼
=== 가계부 테이블 ===

┌─────────────┐       ┌──────────────────┐
│ categories  │──────<│  ledger_entries  │
└─────────────┘       └──────────────────┘

=== 시스템 테이블 (GitHub Actions 동기화) ===

┌─────────────────┐       ┌─────────────────┐
│  stock_master   │       │ exchange_rates  │
│  (종목 마스터)   │       │ (환율)          │
└─────────────────┘       └─────────────────┘
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

-- 종목유형 카테고리
create type stock_type_category as enum (
  'stock',    -- 주식
  'etf',      -- ETF
  'etn',      -- ETN
  'fund',     -- 펀드/수익증권
  'reit',     -- 리츠
  'warrant',  -- 워런트
  'index'     -- 지수
);

-- 거래 유형
create type transaction_type as enum ('buy', 'sell');

-- 초대 상태
create type invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

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

-- 계좌 유형
create type account_type as enum (
  'stock',     -- 주식/증권 계좌
  'savings',   -- 예금 계좌 (보통예금)
  'deposit',   -- 적금 계좌 (정기예금, 정기적금)
  'checking',  -- 입출금 계좌 (월급통장 등)
  'isa',       -- ISA 계좌 (절세 계좌)
  'pension',   -- 연금 계좌 (IRP, 퇴직연금)
  'cma',       -- CMA 계좌
  'other'      -- 기타 계좌
);

-- 계좌 범주 (account_type의 상위 분류)
create type account_category as enum (
  'bank',        -- 일반 은행 계좌 (checking, savings, deposit)
  'investment'   -- 투자 계좌 (stock, cma, isa, pension)
);

-- 결제수단 유형
create type payment_method_type as enum (
  'credit_card',  -- 신용카드
  'debit_card',   -- 체크카드
  'prepaid',      -- 선불지갑 (카카오페이머니, 네이버페이머니 등)
  'gift_card',    -- 상품권
  'cash'          -- 현금
);

-- 가계부 항목 유형
create type ledger_entry_type as enum (
  'expense',   -- 지출
  'income',    -- 수입
  'transfer'   -- 이체 (계좌→계좌, 계좌→결제수단)
);

-- 카테고리 유형
create type category_type as enum (
  'expense',  -- 지출 카테고리
  'income'    -- 수입 카테고리
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

### 4. invitations (이메일 초대)

```sql
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  status invitation_status default 'pending',
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null,

  unique (household_id, email)
);

-- 인덱스
create index invitations_email_idx on public.invitations(email);
create index invitations_status_idx on public.invitations(status);
create index invitations_household_id_idx on public.invitations(household_id);
create index invitations_created_by_idx on public.invitations(created_by);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| household_id | uuid (FK) | 초대한 가구 ID |
| email | text | 초대받는 이메일 주소 |
| status | enum | pending / accepted / expired / cancelled |
| created_by | uuid (FK) | 초대 생성자 ID |
| expires_at | timestamptz | 만료 시간 |
| created_at | timestamptz | 생성 시간 |

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

### 6. accounts (계좌)

```sql
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  broker text,
  account_number text,
  account_type account_type,
  category account_category,         -- 계좌 범주 (bank/investment)
  balance numeric(18, 2),            -- 현재 잔액 (예수금 포함, 수동 입력)
  balance_updated_at timestamptz,    -- 잔액 마지막 수정일
  is_default boolean default false,
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (household_id, owner_id, name)
);

-- 인덱스
create index accounts_household_id_idx on public.accounts(household_id);
create index accounts_owner_id_idx on public.accounts(owner_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 계좌 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| owner_id | uuid (FK) | 계좌 소유자 |
| name | text | 계좌명 |
| broker | text (nullable) | 증권사/은행명 |
| account_number | text (nullable) | 계좌번호 |
| account_type | enum (nullable) | 계좌 유형 |
| category | enum (nullable) | 계좌 범주 (bank/investment) |
| balance | numeric (nullable) | 현재 잔액 — 증권 계좌는 예수금, 은행 계좌는 잔액 |
| balance_updated_at | timestamptz (nullable) | 잔액 마지막 수정일 |
| is_default | boolean | 기본 계좌 여부 |
| memo | text (nullable) | 메모 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

**account_category 분류**

| category | account_type |
|----------|-------------|
| bank | checking, savings, deposit |
| investment | stock, cma, isa, pension |

---

### 7. transactions (거래 기록)

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
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
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_ticker_idx on public.transactions(ticker);
create index transactions_transacted_at_idx on public.transactions(transacted_at);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 거래 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| owner_id | uuid (FK) | 거래 소유자 |
| account_id | uuid (FK, nullable) | 계좌 ID |
| ticker | text | 종목 코드 |
| type | enum | buy / sell |
| quantity | numeric(18,8) | 수량 |
| price | numeric(18,4) | 거래 단가 |
| memo | text (nullable) | 메모 |
| transacted_at | timestamptz | 실제 거래일 |
| created_at | timestamptz | 기록 생성일 |

---

### 8. holdings (현재 보유 현황 View)

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

### 9. tags (사용자 정의 태그)

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

### 10. holding_tags (보유종목-태그 연결)

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

### 11. payment_methods (결제수단)

결제수단은 지출 시 "어떻게 결제했는지"를 추적하기 위한 수단입니다. 계좌(accounts)와 달리 총 자산에 포함되지 않습니다.

> **선불지갑 (카카오페이머니 등)**: 현재는 `type = 'prepaid'`로 등록하여 지출 추적에만 사용합니다. 향후 `prepaid_wallets` 테이블 추가 시 `payment_methods`에 FK 컬럼을 추가하여 잔액/자산 추적을 확장할 수 있습니다.

```sql
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type payment_method_type not null,
  linked_account_id uuid references public.accounts(id) on delete set null,
  issuer text,
  last_four text,
  payment_day smallint check (payment_day is null or (payment_day between 1 and 31)),
  is_default boolean default false,
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (household_id, owner_id, name)
);

-- 인덱스
create index payment_methods_household_id_idx on public.payment_methods(household_id);
create index payment_methods_owner_id_idx on public.payment_methods(owner_id);
create index payment_methods_linked_account_id_idx on public.payment_methods(linked_account_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| owner_id | uuid (FK) | 소유자 |
| name | text | 결제수단명 (예: 삼성카드 체크) |
| type | enum | 결제수단 유형 |
| linked_account_id | uuid (FK, nullable) | 연결 계좌 (체크카드→출금계좌, 신용카드→결제계좌) |
| issuer | text (nullable) | 카드사/서비스명 (삼성카드, 카카오 등) |
| last_four | text (nullable) | 카드 끝 4자리 |
| payment_day | smallint (nullable) | 신용카드 결제일 (1~31) |
| is_default | boolean | 기본 결제수단 여부 |
| memo | text (nullable) | 메모 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

---

### 12. target_allocations (목표 비중)

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

## 가계부 테이블

### categories (지출/수입 카테고리)

가구별로 기본 카테고리를 복사하여 사용. 가입 시 `seed_household_categories()` 함수로 자동 생성.

```sql
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  type          category_type not null,        -- expense / income
  name          text not null,
  icon          text,                          -- Lucide 아이콘명 (예: 'utensils'). null이면 UI 기본 아이콘
  display_order integer not null default 0,
  is_system     boolean not null default false, -- true: 기본 제공, RLS로 수정/삭제 불가
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,

  unique (household_id, type, name)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| household_id | uuid (FK) | 소속 가구 |
| type | enum | expense / income |
| name | text | 카테고리명 |
| icon | text (nullable) | Lucide 아이콘명. 앱 레이어에서 zod로 유효성 검증 |
| display_order | integer | 정렬 순서 |
| is_system | boolean | true면 RLS로 수정/삭제 불가 |

**아이콘 저장 방식**: Lucide 아이콘명 문자열(`'utensils'`, `'home'` 등)을 저장. DB enum 없이 `CATEGORY_ICON_NAMES` 코드 상수와 zod로 유효성 검증. 잘못된 값이 들어온 경우 컴포넌트에서 fallback 아이콘 표시.

---

### ledger_entries (가계부 기록)

지출/수입/이체를 단일 테이블에 저장. `is_shared` 컬럼으로 공용/개인 구분.

```sql
create table public.ledger_entries (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households(id) on delete cascade,
  owner_id             uuid not null references public.profiles(id) on delete cascade,
  type                 ledger_entry_type not null,          -- expense / income / transfer
  amount               numeric(18, 2) not null check (amount > 0),
  title                text,                                -- 내용/제목 (예: 이마트 장보기)
  category_id            uuid references public.categories(id) on delete set null,
  -- 돈의 출발지/목적지: 계좌 또는 결제수단 중 하나
  -- 지출: from_* 하나만 / 수입: to_* 하나만 / 이체: from_* + to_* 둘 다
  from_account_id        uuid references public.accounts(id) on delete set null,
  from_payment_method_id uuid references public.payment_methods(id) on delete set null,
  to_account_id          uuid references public.accounts(id) on delete set null,
  to_payment_method_id   uuid references public.payment_methods(id) on delete set null,
  is_shared            boolean not null default true,
  memo                 text,                                -- 부가 설명 (선택)
  transacted_at        timestamptz not null,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| title | text (nullable) | 내용/제목 (예: "이마트 장보기"). 없으면 카테고리명으로 표시 |
| category_id | FK (nullable) | 지출/수입. 이체는 null |
| from_account_id | FK (nullable) | 출발지가 계좌인 경우 |
| from_payment_method_id | FK (nullable) | 출발지가 결제수단인 경우 (카드, 현금, 페이 등) |
| to_account_id | FK (nullable) | 목적지가 계좌인 경우 |
| to_payment_method_id | FK (nullable) | 목적지가 결제수단인 경우 (페이 충전, 상품권 구매 등) |
| is_shared | boolean | true: 가구원 전체 조회 가능 / false: 본인만 조회 가능 |
| memo | text (nullable) | 부가 설명. title과 분리된 진짜 메모 |

**유형별 컬럼 사용 패턴**

| 유형 | from_account | from_payment | to_account | to_payment |
|------|:-:|:-:|:-:|:-:|
| 지출 (카드/현금/페이) | | ✓ | | |
| 지출 (계좌 직접 출금) | ✓ | | | |
| 수입 (계좌 입금) | | | ✓ | |
| 수입 (페이 등으로 입금) | | | | ✓ |
| 이체 계좌→계좌 | ✓ | | ✓ | |
| 이체 계좌→결제수단 (페이 충전) | ✓ | | | ✓ |
| 이체 결제수단→계좌 (페이 출금) | | ✓ | ✓ | |
| 이체 결제수단→결제수단 | | ✓ | | ✓ |

**RLS 정책 요약**

| 조건 | SELECT 가능 범위 |
|------|----------------|
| is_shared = true | 같은 가구 구성원 전체 |
| is_shared = false | 기록한 본인(owner_id)만. 가구 `owner` 역할과 무관 |

파트너에게 개인 지출 월 합계만 노출: `get_private_entry_totals(hh_id, year, month)` SECURITY DEFINER 함수 사용.

---

## 시스템 테이블 (GitHub Actions 동기화)

> GitHub Actions에서 service_role_key로 쓰기 접근.
>
> **RLS 상태**:
> - `stock_master`, `exchange_rates`, `stock_prices`: RLS 활성화 + 읽기 허용 (`using(true)`)
> - `system_config`: RLS 활성화 + 전체 차단 (service_role만 접근 가능)

### 12. stock_master (종목 마스터)

KIS 마스터파일 기반 종목 기본 정보. 매일 08:00 KST에 GitHub Actions로 동기화.

> ⚠️ 가격 정보는 마스터파일에 포함되지 않음. 가격은 `stock_prices` 테이블에서 관리.

```sql
-- pg_trgm 확장 (유사도 검색용)
create extension if not exists pg_trgm;

create table public.stock_master (
  id uuid primary key default gen_random_uuid(),

  -- 기본 정보
  code text not null,                      -- 종목코드 (005930, AAPL)
  name text not null,                      -- 종목명 (한글)
  name_en text,                            -- 종목명 (영문, US용)
  choseong text,                           -- 초성 (한글명이 있는 경우)

  -- 시장 정보
  market market_type not null,             -- KR, US
  exchange text,                           -- KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX

  -- 종목유형 분류
  stock_type_code text,                    -- 원본 코드 (KR: ST,EF / US: 2,3)
  stock_type_name text,                    -- 한글명 (주권, ETF)
  stock_type_category stock_type_category, -- 통합 카테고리 (enum)

  -- 거래 상태
  is_active boolean default true,          -- 상장 여부
  is_suspended boolean default false,      -- 거래정지 (KR)

  -- 메타
  synced_at timestamptz default now(),     -- 마지막 동기화

  unique(market, code)
);

-- 검색용 인덱스
create index stock_master_market_code_idx on public.stock_master(market, code);
create index stock_master_market_active_idx on public.stock_master(market, is_active)
  where is_active = true;
create index stock_master_choseong_idx on public.stock_master
  using gin(choseong gin_trgm_ops);
create index stock_master_name_idx on public.stock_master
  using gin(name gin_trgm_ops);
create index stock_master_name_en_idx on public.stock_master
  using gin(name_en gin_trgm_ops);
create index stock_master_stock_type_category_idx on public.stock_master(stock_type_category);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| code | text | 종목코드 (005930, AAPL) |
| name | text | 종목명 (한글) |
| name_en | text (nullable) | 종목명 (영문, US용) |
| choseong | text (nullable) | 초성 (한글명이 있는 경우) |
| market | enum | 시장 구분 (KR, US) |
| exchange | text | 거래소 (KOSPI, NASDAQ 등) |
| stock_type_code | text (nullable) | 종목유형 원본 코드 |
| stock_type_name | text (nullable) | 종목유형 한글명 |
| stock_type_category | enum (nullable) | 통합 카테고리 |
| is_active | boolean | 상장 여부 |
| is_suspended | boolean | 거래정지 여부 |
| synced_at | timestamptz | 마지막 동기화 시각 |

**종목유형 카테고리**

`stock_type_category`로 국내/해외 종목 통합 필터링:

| category | 설명 | KR 코드 | US 코드 |
|----------|------|---------|---------|
| stock | 주식 | ST, DR, FS | 2 |
| etf | ETF | EF, FE | 3 |
| etn | ETN | EN | - |
| fund | 펀드 | MF, SC, IF, PF, BC | - |
| reit | 리츠 | RT | - |
| warrant | 워런트 | SW, SR, EW | 4 |
| index | 지수 | - | 1 |

```sql
-- 국내/해외 ETF 통합 조회
select * from stock_master where stock_type_category = 'etf';
```

**데이터 소스**
- 국내 (KR): `kospi_code.mst`, `kosdaq_code.mst`
- 해외 (US): `nasmst.cod`, `nysmst.cod`, `amsmst.cod`

---

### 13. exchange_rates (환율)

일 1회 ExchangeRate-API에서 동기화.

```sql
create table public.exchange_rates (
  from_currency currency_type not null,
  to_currency currency_type not null,
  rate numeric(18, 6) not null,
  updated_at timestamptz default now(),

  primary key (from_currency, to_currency)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| from_currency | enum (PK) | 원본 통화 (USD) |
| to_currency | enum (PK) | 대상 통화 (KRW) |
| rate | numeric | 환율 (예: 1430.50) |
| updated_at | timestamptz | 마지막 업데이트 |

**사용 예시**
```sql
-- USD → KRW 환율 조회
select rate from exchange_rates
where from_currency = 'USD' and to_currency = 'KRW';
```

---

### 14. stock_prices (주식 가격 캐시)

KIS API 조회 결과를 캐싱. 1시간 버킷 단위로 캐시 유효성 판단.

> RLS 활성화 + 읽기 허용. 쓰기는 서버 컴포넌트/Server Action에서만 접근.

```sql
create table public.stock_prices (
  market market_type not null,           -- KR, US
  code text not null,                    -- 종목코드
  price numeric(18, 4) not null,         -- 현재가
  change_rate numeric(8, 4),             -- 등락률 (%)
  fetched_at timestamptz not null,       -- 조회 시각

  primary key (market, code)
);

-- 인덱스
create index stock_prices_fetched_at_idx on public.stock_prices(fetched_at);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| market | enum (PK) | 시장 구분 (KR, US) |
| code | text (PK) | 종목코드 |
| price | numeric | 현재가 |
| change_rate | numeric (nullable) | 등락률 (%) |
| fetched_at | timestamptz | KIS API 조회 시각 |

**캐싱 정책**
- 1시간 버킷 단위 (정각 기준)
- 같은 시간대 요청은 캐시 반환
- 캐시 만료 시 KIS API 호출 후 upsert

**사용 예시**
```typescript
// lib/services/stock-price.ts
const currentBucket = Math.floor(Date.now() / (60 * 60 * 1000));
const cacheBucket = Math.floor(fetchedAt.getTime() / (60 * 60 * 1000));

if (currentBucket === cacheBucket) {
  // 캐시 유효 → 바로 반환
} else {
  // 캐시 만료 → KIS API 호출
}
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

### accounts

```sql
alter table public.accounts enable row level security;

create policy "Users can view household accounts"
  on public.accounts for select
  using (is_household_member(household_id));

create policy "Users can insert household accounts"
  on public.accounts for insert
  with check (is_household_member(household_id));

create policy "Users can update own accounts"
  on public.accounts for update
  using (is_household_member(household_id) and owner_id = auth.uid());

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (is_household_member(household_id) and owner_id = auth.uid());
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

-- 가구 멤버이거나 본인 이메일로 초대된 경우 조회 가능
create policy "Users can view invitations by email or household"
  on public.invitations for select
  using (
    is_household_member(household_id)
    or email = (select email from auth.users where id = auth.uid())
  );

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

### payment_methods

```sql
alter table public.payment_methods enable row level security;

create policy "Users can view household payment methods"
  on public.payment_methods for select
  using (is_household_member(household_id));

create policy "Users can insert household payment methods"
  on public.payment_methods for insert
  with check (is_household_member(household_id));

create policy "Users can update own payment methods"
  on public.payment_methods for update
  using (is_household_member(household_id) and owner_id = (select auth.uid()));

create policy "Users can delete own payment methods"
  on public.payment_methods for delete
  using (is_household_member(household_id) and owner_id = (select auth.uid()));
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

### 자산 기록 플로우

```
1. 자산 유형 선택 (/assets에서 유형 카드 클릭)
      ↓
2. [주식의 경우] 종목 검색 (stock_master에서 로컬 검색)
      ↓
3. household_stock_settings에 종목 없으면 자동 생성
      ↓
4. transactions에 거래 기록 INSERT
      ↓
5. holdings View에서 자동으로 최신 보유 현황 반영
```

**URL 구조와 DB 매핑**
```
/assets/stock/transactions/new  → transactions 테이블 (주식)
/assets/stock/holdings          → holdings View (asset_type = 'equity')
/assets/total/holdings          → holdings View (전체)
```

### 조회 플로우

```
종목 검색     → stock_master 테이블 (pg_trgm 유사도 검색)
현재 보유 현황 → holdings View 조회 (asset_type으로 필터링 가능)
거래 내역     → transactions 테이블 조회
종목 설정     → household_stock_settings 조회
자산 추이     → transactions를 날짜별 집계
환율 조회     → exchange_rates 테이블
시세 조회     → stock_master.base_price (전일 종가)
```

### 초대 수락 플로우

**정책**: 1인 1가구 원칙. 단독 가구일 때만 초대 수락 가능.

```
1. 이메일 초대 유효성 검증
   ├── 초대 존재 여부 (email 기준)
   ├── 만료 여부 (24시간)
   └── 상태 확인 (status = 'pending')
      ↓
2. 사용자 가구 상태 확인
   ├── 다른 구성원이 있는 가구 → 에러 반환 (이미 가구에 소속됨)
   └── 단독 가구 (본인만 있음) → 3단계로 진행
      ↓
3. 데이터 마이그레이션 (단독 가구인 경우)
   ├── transactions.household_id → 새 가구 ID로 업데이트
   └── household_stock_settings → 새 가구로 이동 (UPSERT)
      ↓
4. 가구 이동 처리
   ├── 기존 household_members에서 삭제
   ├── 기존 households 삭제 (단독 가구였으므로)
   └── 새 household_members에 member 역할로 추가
      ↓
5. 초대 상태 업데이트
   └── invitations.status → 'accepted'로 변경
```

**에러 케이스**
| 상황 | 에러 코드 | 메시지 |
|------|----------|--------|
| 초대 없음 | INVITATION_NOT_FOUND | 유효하지 않은 초대입니다 |
| 만료됨 | INVITATION_EXPIRED | 만료된 초대입니다 |
| 이미 수락됨 | INVITATION_ALREADY_ACCEPTED | 이미 수락된 초대입니다 |
| 같은 가구 | INVITATION_SAME_HOUSEHOLD | 이미 해당 가구의 구성원입니다 |
| 가구 소속 | HOUSEHOLD_HAS_MEMBERS | 이미 다른 가구에 소속되어 있습니다 |

### 시스템 데이터 동기화 (GitHub Actions)

```
매일 08:00 KST
├── KIS 마스터파일 다운로드
│   ├── kospi_code.mst, kosdaq_code.mst (국내)
│   └── nasmst.cod, nysmst.cod, amsmst.cod (해외)
├── stock_master UPSERT
└── ExchangeRate-API 호출 → exchange_rates UPSERT
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
    ├── 20240101000012_create_rls_policies.sql
    ├── 20240101000013_create_stock_master.sql
    ├── 20240101000014_create_exchange_rates.sql
    └── 20260423000000_create_ledger_schema.sql   ← categories, ledger_entries, RLS
```