-- 가계부 스키마: categories, ledger_entries
-- is_shared 기반 RLS로 공용/개인 지출 격리

-- ============================================================
-- 1. Enum 타입
-- ============================================================

create type ledger_entry_type as enum ('expense', 'income', 'transfer');
create type category_type as enum ('expense', 'income');

-- ============================================================
-- 2. categories 테이블
-- ============================================================

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  type          category_type not null,
  name          text not null,
  icon          text,           -- Lucide 아이콘명 (예: 'utensils'). null이면 UI에서 기본 아이콘 표시
  display_order integer not null default 0,
  is_system     boolean not null default false,  -- true: 기본 제공, RLS로 수정/삭제 불가
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,

  unique (household_id, type, name)
);

create index categories_household_id_idx on public.categories(household_id);
create index categories_household_type_idx on public.categories(household_id, type);

-- ============================================================
-- 3. ledger_entries 테이블
-- ============================================================

create table public.ledger_entries (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households(id) on delete cascade,
  owner_id             uuid not null references public.profiles(id) on delete cascade,

  type                 ledger_entry_type not null,
  amount               numeric(18, 2) not null check (amount > 0),

  -- 카테고리 (이체는 null)
  category_id            uuid references public.categories(id) on delete set null,

  -- 돈의 출발지/목적지: 계좌 또는 결제수단 중 하나
  -- 지출: from_* 하나만 채움 (어떤 수단으로 결제했는지)
  -- 수입: to_*  하나만 채움 (어느 계좌/수단으로 입금됐는지)
  -- 이체: from_* + to_* 둘 다 채움
  from_account_id        uuid references public.accounts(id) on delete set null,
  from_payment_method_id uuid references public.payment_methods(id) on delete set null,
  to_account_id          uuid references public.accounts(id) on delete set null,
  to_payment_method_id   uuid references public.payment_methods(id) on delete set null,

  -- 공용(true): 가구원 전체 조회 가능 / 개인(false): 본인만 조회 가능
  is_shared            boolean not null default true,

  memo                 text,
  transacted_at        timestamptz not null,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

create index ledger_entries_household_id_idx on public.ledger_entries(household_id);
create index ledger_entries_owner_id_idx on public.ledger_entries(owner_id);
create index ledger_entries_transacted_at_idx on public.ledger_entries(transacted_at);
create index ledger_entries_category_id_idx on public.ledger_entries(category_id);
-- 월별 조회 최적화: household_id + transacted_at 복합 인덱스로 range scan 지원
create index ledger_entries_household_transacted_at_idx
  on public.ledger_entries(household_id, transacted_at);

-- ============================================================
-- 4. 기본 카테고리 시드 함수
-- ============================================================

create or replace function public.seed_household_categories(hh_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (household_id, type, name, icon, display_order, is_system)
  values
    -- 지출 카테고리
    (hh_id, 'expense', '식비',         'utensils',        1,  true),
    (hh_id, 'expense', '주거비',        'home',            2,  true),
    (hh_id, 'expense', '교통비',        'car',             3,  true),
    (hh_id, 'expense', '공과금',        'zap',             4,  true),
    (hh_id, 'expense', '보험료',        'shield',          5,  true),
    (hh_id, 'expense', '의료비',        'stethoscope',     6,  true),
    (hh_id, 'expense', '교육비',        'book-open',       7,  true),
    (hh_id, 'expense', '쇼핑',          'shopping-cart',   8,  true),
    (hh_id, 'expense', '여가/문화',     'clapperboard',    9,  true),
    (hh_id, 'expense', '미용',          'sparkles',        10, true),
    (hh_id, 'expense', '구독/정기결제', 'repeat',          11, true),
    (hh_id, 'expense', '경조사',        'gift',            12, true),
    (hh_id, 'expense', '저축/투자',     'piggy-bank',      13, true),
    (hh_id, 'expense', '기타',          'package',         14, true),
    -- 수입 카테고리
    (hh_id, 'income',  '급여',          'briefcase',       1,  true),
    (hh_id, 'income',  '부수입',        'laptop',          2,  true),
    (hh_id, 'income',  '이자/배당',     'trending-up',     3,  true),
    (hh_id, 'income',  '환급',          'rotate-ccw',      4,  true),
    (hh_id, 'income',  '용돈/선물',     'heart-handshake', 5,  true),
    (hh_id, 'income',  '기타',          'package',         6,  true);
end;
$$;

-- ============================================================
-- 5. 가구 생성 트리거에 시드 함수 추가
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
begin
  -- 1. 프로필 생성
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));

  -- 2. 가구 생성
  insert into public.households (name)
  values ('우리집')
  returning id into new_household_id;

  -- 3. 가구 owner로 등록
  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  -- 4. 기본 카테고리 생성
  perform public.seed_household_categories(new_household_id);

  return new;
end;
$$;

-- ============================================================
-- 6. RLS — categories
-- ============================================================

alter table public.categories enable row level security;

create policy "Users can view household categories"
  on public.categories for select
  using (public.is_household_member(household_id));

create policy "Users can insert household categories"
  on public.categories for insert
  with check (public.is_household_member(household_id));

-- is_system=true 카테고리는 RLS 수준에서 수정/삭제 차단
create policy "Users can update non-system categories"
  on public.categories for update
  using (public.is_household_member(household_id) and is_system = false);

create policy "Users can delete non-system categories"
  on public.categories for delete
  using (public.is_household_member(household_id) and is_system = false);

-- ============================================================
-- 7. RLS — ledger_entries
-- ============================================================

alter table public.ledger_entries enable row level security;

-- 공용 항목: 가구원 전체 조회 / 개인 항목: 본인만 조회
create policy "Users can view shared and own ledger entries"
  on public.ledger_entries for select
  using (
    (is_shared = true and public.is_household_member(household_id))
    or owner_id = auth.uid()
  );

create policy "Users can insert own ledger entries"
  on public.ledger_entries for insert
  with check (public.is_household_member(household_id) and owner_id = auth.uid());

create policy "Users can update own ledger entries"
  on public.ledger_entries for update
  using (owner_id = auth.uid());

create policy "Users can delete own ledger entries"
  on public.ledger_entries for delete
  using (owner_id = auth.uid());

-- ============================================================
-- 8. 개인 지출 합계 함수 (SECURITY DEFINER)
--    파트너가 호출 시 가구 내 owner별 개인 지출 합계만 반환
--    세부 내역(memo, category)은 노출하지 않음
-- ============================================================

create or replace function public.get_private_entry_totals(
  hh_id   uuid,
  p_year  int,
  p_month int
)
returns table(owner_id uuid, total_amount numeric)
language sql
security definer
stable
set search_path = ''
as $$
  select
    le.owner_id,
    coalesce(sum(le.amount), 0) as total_amount
  from public.ledger_entries le
  where
    le.household_id = hh_id
    and le.is_shared = false
    and le.type = 'expense'
    and extract(year  from le.transacted_at) = p_year
    and extract(month from le.transacted_at) = p_month
  group by le.owner_id;
$$;
