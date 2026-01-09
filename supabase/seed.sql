-- Seed data for local development
-- 이 파일은 `supabase db reset` 실행 시 자동으로 적용됩니다.

-- ============================================================================
-- 테스트 계정 생성
-- ============================================================================
-- 계정 1 (관리자): admin@example.com / test1234
-- 계정 2 (가구원): member@example.com / test1234
-- 두 계정은 같은 가구 '테스트 가구'에 속합니다.
-- ============================================================================

-- 1. 관리자 계정 생성 (handle_new_user 트리거가 가구 자동 생성)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('test1234', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "관리자"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- 2. 가구원 계정 생성 (트리거가 별도 가구 생성하므로 나중에 수정 필요)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'member@example.com',
  crypt('test1234', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "가구원"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- 3. 가구 이름 변경 및 가구원을 관리자 가구로 이동
DO $$
DECLARE
  admin_household_id uuid;
  member_household_id uuid;
BEGIN
  -- 관리자의 가구 ID 조회
  SELECT household_id INTO admin_household_id
  FROM public.household_members
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  -- 가구원의 가구 ID 조회
  SELECT household_id INTO member_household_id
  FROM public.household_members
  WHERE user_id = '00000000-0000-0000-0000-000000000002';

  -- 관리자 가구 이름 변경
  UPDATE public.households
  SET name = '테스트 가구'
  WHERE id = admin_household_id;

  -- 가구원을 관리자 가구로 이동 (role: member)
  UPDATE public.household_members
  SET household_id = admin_household_id, role = 'member'
  WHERE user_id = '00000000-0000-0000-0000-000000000002';

  -- 가구원의 기존 빈 가구 삭제
  DELETE FROM public.households WHERE id = member_household_id;
END $$;

-- ============================================================================
-- 환율 초기 데이터
-- ============================================================================

-- 환율 초기 데이터 (양방향)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate)
VALUES
  ('USD', 'KRW', 1450.000000),
  ('KRW', 'USD', 0.000690);
