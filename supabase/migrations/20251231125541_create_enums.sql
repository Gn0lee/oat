-- Enum 타입 정의

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
