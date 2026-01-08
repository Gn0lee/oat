-- Seed data for local development
-- 이 파일은 `supabase db reset` 실행 시 자동으로 적용됩니다.

-- 환율 초기 데이터 (양방향)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate)
VALUES
  ('USD', 'KRW', 1450.000000),
  ('KRW', 'USD', 0.000690);
