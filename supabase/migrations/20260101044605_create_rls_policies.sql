-- RLS Policies
-- 테이블별 Row Level Security 정책 설정
-- 성능 최적화: auth.uid()를 (select auth.uid())로 사용하여 매 행 재평가 방지
-- 중복 permissive 정책 통합: 같은 action에 여러 정책 대신 OR 조건으로 통합

-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

-- SELECT: 본인, 같은 가구 멤버, Admin 통합
create policy "Users can view profiles"
  on public.profiles for select
  using (
    (select auth.uid()) = id
    or id in (
      select user_id from public.household_members
      where household_id in (select get_user_household_ids())
    )
    or is_admin()
  );

-- UPDATE: 본인만
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- ============================================================================
-- households
-- ============================================================================
alter table public.households enable row level security;

-- SELECT: 멤버, Admin 통합
create policy "Users can view households"
  on public.households for select
  using (is_household_member(id) or is_admin());

create policy "Users can create household"
  on public.households for insert
  with check (true);

create policy "Owners can update household"
  on public.households for update
  using (is_household_owner(id));

create policy "Owners can delete household"
  on public.households for delete
  using (is_household_owner(id));

-- ============================================================================
-- household_members
-- ============================================================================
alter table public.household_members enable row level security;

create policy "Users can view household members"
  on public.household_members for select
  using (is_household_member(household_id));

create policy "Owners can add members"
  on public.household_members for insert
  with check (is_household_owner(household_id) or user_id = (select auth.uid()));

create policy "Owners can remove members or self"
  on public.household_members for delete
  using (is_household_owner(household_id) or user_id = (select auth.uid()));

-- ============================================================================
-- household_stock_settings
-- ============================================================================
alter table public.household_stock_settings enable row level security;

create policy "Users can view household stock settings"
  on public.household_stock_settings for select
  using (is_household_member(household_id));

create policy "Users can insert household stock settings"
  on public.household_stock_settings for insert
  with check (is_household_member(household_id));

create policy "Users can update household stock settings"
  on public.household_stock_settings for update
  using (is_household_member(household_id));

create policy "Users can delete household stock settings"
  on public.household_stock_settings for delete
  using (is_household_member(household_id));

-- ============================================================================
-- transactions
-- ============================================================================
alter table public.transactions enable row level security;

create policy "Users can view household transactions"
  on public.transactions for select
  using (is_household_member(household_id));

create policy "Users can insert household transactions"
  on public.transactions for insert
  with check (is_household_member(household_id));

create policy "Users can update own transactions"
  on public.transactions for update
  using (is_household_member(household_id) and owner_id = (select auth.uid()));

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (is_household_member(household_id) and owner_id = (select auth.uid()));

-- ============================================================================
-- invitations
-- ============================================================================
alter table public.invitations enable row level security;

-- SELECT: 가구 멤버이거나 누구나 (코드로 조회 가능) 통합
-- 주의: using(true)는 모든 조회를 허용하므로 보안상 주의 필요
-- 추후 코드 기반 필터링으로 개선 고려
create policy "Anyone can view invitations"
  on public.invitations for select
  using (true);

create policy "Users can create household invitations"
  on public.invitations for insert
  with check (is_household_member(household_id));

-- ============================================================================
-- tags
-- ============================================================================
alter table public.tags enable row level security;

create policy "Users can view household tags"
  on public.tags for select
  using (is_household_member(household_id));

create policy "Users can insert household tags"
  on public.tags for insert
  with check (is_household_member(household_id));

create policy "Users can update household tags"
  on public.tags for update
  using (is_household_member(household_id));

create policy "Users can delete household tags"
  on public.tags for delete
  using (is_household_member(household_id));

-- ============================================================================
-- holding_tags
-- ============================================================================
alter table public.holding_tags enable row level security;

create policy "Users can view household holding_tags"
  on public.holding_tags for select
  using (is_household_member(household_id));

create policy "Users can insert household holding_tags"
  on public.holding_tags for insert
  with check (is_household_member(household_id));

create policy "Users can update household holding_tags"
  on public.holding_tags for update
  using (is_household_member(household_id));

create policy "Users can delete household holding_tags"
  on public.holding_tags for delete
  using (is_household_member(household_id));

-- ============================================================================
-- target_allocations
-- ============================================================================
alter table public.target_allocations enable row level security;

create policy "Users can view household targets"
  on public.target_allocations for select
  using (is_household_member(household_id));

create policy "Users can insert household targets"
  on public.target_allocations for insert
  with check (is_household_member(household_id));

create policy "Users can update household targets"
  on public.target_allocations for update
  using (is_household_member(household_id));

create policy "Users can delete household targets"
  on public.target_allocations for delete
  using (is_household_member(household_id));

-- ============================================================================
-- stock_master (시스템 테이블 - 읽기 전용)
-- ============================================================================
alter table public.stock_master enable row level security;

-- 모든 인증된 사용자가 조회 가능 (종목 검색용)
create policy "Anyone can view stock_master"
  on public.stock_master for select
  using (true);

-- ============================================================================
-- exchange_rates (시스템 테이블 - 읽기 전용)
-- ============================================================================
alter table public.exchange_rates enable row level security;

-- 모든 인증된 사용자가 조회 가능 (환율 조회용)
create policy "Anyone can view exchange_rates"
  on public.exchange_rates for select
  using (true);
