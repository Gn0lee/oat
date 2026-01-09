-- Seed data for local development
-- 이 파일은 `supabase db reset` 실행 시 자동으로 적용됩니다.

-- ============================================================================
-- 테스트 계정 생성
-- ============================================================================
-- 계정 1 (관리자): admin@example.com / test1234
-- 계정 2 (가구원): member@example.com / test1234
-- 두 계정은 같은 가구 '테스트 가구'에 속합니다.
-- ============================================================================

-- 1. 관리자 계정 생성 (트리거가 profiles만 생성)
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
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
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
  '',
  '',
  '',
  '',
  '',
  '',
  ''
);

-- 2. 가구원 계정 생성
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
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
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
  '',
  '',
  '',
  '',
  '',
  '',
  ''
);

-- 3. auth.identities 생성 (Supabase Auth 로그인에 필요)
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "admin@example.com", "email_verified": true}',
  'email',
  now(),
  now(),
  now()
), (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub": "00000000-0000-0000-0000-000000000002", "email": "member@example.com", "email_verified": true}',
  'email',
  now(),
  now(),
  now()
);

-- 4. 가구 생성 및 멤버십 설정
INSERT INTO public.households (id, name)
VALUES ('00000000-0000-0000-0000-000000000010', '테스트 가구');

INSERT INTO public.household_members (household_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'member');

-- ============================================================================
-- 환율 초기 데이터
-- ============================================================================

-- 환율 초기 데이터 (양방향)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate)
VALUES
  ('USD', 'KRW', 1450.000000),
  ('KRW', 'USD', 0.000690);
