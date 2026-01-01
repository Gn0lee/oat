-- tags (사용자 정의 태그)
-- MVP에서는 테이블만 생성, UI는 2단계에서 구현

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

-- holding_tags (보유종목-태그 연결)

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

-- target_allocations (목표 비중)

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
