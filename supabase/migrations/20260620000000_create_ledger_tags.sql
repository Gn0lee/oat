-- 가계부 태그 스키마
-- ledger_tags, ledger_entry_tags 테이블 및 RLS 정의

-- ============================================================
-- 1. ledger_tags 테이블
-- ============================================================
create table public.ledger_tags (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  name           text not null,
  name_normalized text not null,
  last_used_at   timestamptz,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null,

  unique (household_id, name_normalized),
  constraint ledger_tags_name_length_check check (char_length(name) between 1 and 15),
  constraint ledger_tags_name_trim_check check (name = btrim(name)),
  constraint ledger_tags_name_whitespace_check check (name !~ '\s')
);

-- ============================================================
-- 2. ledger_entry_tags 테이블
-- ============================================================
create table public.ledger_entry_tags (
  ledger_entry_id uuid not null references public.ledger_entries(id) on delete cascade,
  tag_id          uuid not null references public.ledger_tags(id) on delete cascade,
  household_id    uuid not null references public.households(id) on delete cascade,
  created_at      timestamptz default now() not null,

  primary key (ledger_entry_id, tag_id)
);

-- ============================================================
-- 3. 인덱스 생성
-- ============================================================
create index ledger_tags_household_last_used_idx on public.ledger_tags(household_id, last_used_at desc, name asc);
create index ledger_entry_tags_tag_id_idx on public.ledger_entry_tags(tag_id);
create index ledger_entry_tags_household_tag_idx on public.ledger_entry_tags(household_id, tag_id);

-- ============================================================
-- 4. RLS - ledger_tags
-- ============================================================
alter table public.ledger_tags enable row level security;

create policy "Users can view household ledger tags"
  on public.ledger_tags for select
  using (public.is_household_member(household_id));

create policy "Users can insert household ledger tags"
  on public.ledger_tags for insert
  with check (public.is_household_member(household_id));

create policy "Users can update household ledger tags"
  on public.ledger_tags for update
  using (public.is_household_member(household_id));

create policy "Users can delete household ledger tags"
  on public.ledger_tags for delete
  using (public.is_household_member(household_id));

-- ============================================================
-- 5. RLS - ledger_entry_tags
-- ============================================================
alter table public.ledger_entry_tags enable row level security;

create policy "Users can view ledger entry tags of accessible entries"
  on public.ledger_entry_tags for select
  using (
    exists (
      select 1 from public.ledger_entries le
      where le.id = ledger_entry_tags.ledger_entry_id
        and (
          (le.is_shared = true and public.is_household_member(le.household_id))
          or le.owner_id = auth.uid()
        )
    )
  );

create policy "Users can insert ledger entry tags for owned entries"
  on public.ledger_entry_tags for insert
  with check (
    exists (
      select 1 from public.ledger_entries le
      where le.id = ledger_entry_tags.ledger_entry_id
        and le.owner_id = auth.uid()
        and le.household_id = ledger_entry_tags.household_id
    )
  );

create policy "Users can delete ledger entry tags for owned entries"
  on public.ledger_entry_tags for delete
  using (
    exists (
      select 1 from public.ledger_entries le
      where le.id = ledger_entry_tags.ledger_entry_id
        and le.owner_id = auth.uid()
        and le.household_id = ledger_entry_tags.household_id
    )
  );
