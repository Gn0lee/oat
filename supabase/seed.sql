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
  extensions.crypt('test1234', extensions.gen_salt('bf')),
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
  extensions.crypt('test1234', extensions.gen_salt('bf')),
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
-- handle_new_user 트리거가 auth.users INSERT 시 자동으로 가구/멤버십을 생성하므로
-- 테스트 가구로 교체하기 위해 트리거 생성 데이터를 먼저 정리한다.
-- households CASCADE → household_members, categories 함께 삭제
DELETE FROM public.households;

INSERT INTO public.households (id, name)
VALUES ('00000000-0000-0000-0000-000000000010', '테스트 가구');

INSERT INTO public.household_members (household_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'member');

-- 테스트 가구 기본 카테고리 생성 (#236)
SELECT public.seed_household_categories('00000000-0000-0000-0000-000000000010');

-- ============================================================================
-- 환율 초기 데이터
-- ============================================================================

-- 환율 초기 데이터 (양방향)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate)
VALUES
  ('USD', 'KRW', 1450.000000),
  ('KRW', 'USD', 0.000690);

-- ============================================================================
-- 개발 검증용 금융 데이터
-- ============================================================================

-- Accounts
INSERT INTO public.accounts (
  id, household_id, owner_id, name, broker, last_four, account_type, category, balance, balance_updated_at, memo
) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '관리자 생활비 통장', '국민은행', '1111', 'checking', 'bank', 2450000.00, now(), '개발용 관리자 입출금 계좌'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '관리자 투자 계좌', '미래에셋', '2222', 'stock', 'investment', 12500000.00, now(), '주식 거래 검증용 계좌'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '가구원 생활비 통장', '신한은행', '3333', 'checking', 'bank', 1320000.00, now(), '개발용 가구원 입출금 계좌'),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '가구원 투자 계좌', '한국투자', '4444', 'stock', 'investment', 6800000.00, now(), '가구원 주식 거래 검증용 계좌');

-- Payment Methods
INSERT INTO public.payment_methods (
  id, household_id, owner_id, name, type, linked_account_id, issuer, last_four, payment_day, balance, balance_updated_at, memo
) VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '관리자 생활카드', 'credit_card', '00000000-0000-0000-0000-000000000101', '현대카드', '1234', 25, null, null, '공유 지출 검증용 카드'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '관리자 현금', 'cash', null, null, null, null, 180000.00, now(), '현금/이체 검증용'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '가구원 생활카드', 'credit_card', '00000000-0000-0000-0000-000000000103', '삼성카드', '5678', 10, null, null, '가구원 지출 검증용 카드');

-- Stock Settings
INSERT INTO public.household_stock_settings (
  household_id, ticker, name, asset_type, market, currency, risk_level
) VALUES
('00000000-0000-0000-0000-000000000010', '005930', '삼성전자', 'equity', 'KR', 'KRW', 'moderate'),
('00000000-0000-0000-0000-000000000010', 'AAPL', 'Apple Inc.', 'equity', 'US', 'USD', 'aggressive'),
('00000000-0000-0000-0000-000000000010', 'MSFT', 'Microsoft Corp.', 'equity', 'US', 'USD', 'aggressive');

-- Ledger Entries
INSERT INTO public.ledger_entries (
  id, household_id, owner_id, amount, title, type, is_shared, memo, transacted_at, 
  from_payment_method_id, to_account_id, from_account_id, category_id, to_payment_method_id
) VALUES
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 18500, '점심 식사', 'expense', true, '오늘 공유 지출 상세 확인용', now(), '00000000-0000-0000-0000-000000000201', null, null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'expense' and name = '식비'), null),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 9900, '개인 구독', 'expense', false, '개인 기록 노출 범위 확인용', now() - interval '2 hours', '00000000-0000-0000-0000-000000000201', null, null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'expense' and name = '구독/정기결제'), null),
('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 42000, '장보기', 'expense', true, null, now() - interval '1 day', '00000000-0000-0000-0000-000000000203', null, null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'expense' and name = '식비'), null),
('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 3200000, '월급', 'income', true, '수입 상세 확인용', now() - interval '3 days', null, '00000000-0000-0000-0000-000000000101', null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'income' and name = '급여'), null),
('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 250000, '부수입 정산', 'income', false, '과거 개인 수입', now() - interval '35 days', null, '00000000-0000-0000-0000-000000000103', null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'income' and name = '부수입'), null),
('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 500000, '투자금 이체', 'transfer', true, '계좌 간 이체 검증', now() - interval '5 days', null, '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000101', null, null),
('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 50000, '현금 인출', 'transfer', true, null, now() - interval '6 days', null, null, '00000000-0000-0000-0000-000000000101', null, '00000000-0000-0000-0000-000000000202'),
('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 15800, '카페', 'expense', true, '일간조회 과거 날짜 상세 진입 확인용', now() - interval '14 days', '00000000-0000-0000-0000-000000000203', null, null, (select id from public.categories where household_id = '00000000-0000-0000-0000-000000000010' and type = 'expense' and name = '여가/문화'), null);

-- Stock Transactions
INSERT INTO public.transactions (
  id, household_id, owner_id, ticker, type, quantity, price, account_id, memo, transacted_at
) VALUES
('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '005930', 'buy', 10, 75000, '00000000-0000-0000-0000-000000000102', '오늘 매수 상세 확인용', now()),
('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '005930', 'sell', 2, 76500, '00000000-0000-0000-0000-000000000102', null, now() - interval '1 day'),
('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'AAPL', 'buy', 5, 195.1200, '00000000-0000-0000-0000-000000000102', '달러 자산 매수', now() - interval '7 days'),
('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'MSFT', 'buy', 3, 430.5000, '00000000-0000-0000-0000-000000000102', '종목 필터 검증', now() - interval '12 days'),
('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '005930', 'buy', 4, 74800, '00000000-0000-0000-0000-000000000104', '가구원 거래', now() - interval '3 days'),
('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'AAPL', 'buy', 2, 188.0000, '00000000-0000-0000-0000-000000000104', null, now() - interval '20 days'),
('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'AAPL', 'sell', 1, 201.0000, '00000000-0000-0000-0000-000000000104', '매도 거래 검증', now() - interval '2 days');
