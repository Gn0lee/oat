-- stock_prices 테이블 RLS 정책 추가
-- 시스템 테이블 (GitHub Actions에서 갱신) - 읽기 전용

-- ============================================================================
-- stock_prices (시스템 테이블 - 읽기 전용)
-- ============================================================================
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자 모두 허용 (공용 가격 데이터)
CREATE POLICY "Anyone can view stock_prices"
  ON public.stock_prices FOR SELECT
  USING (true);

-- 쓰기: service_role만 허용 (RLS는 기본적으로 service_role 우회)
-- 일반 사용자는 INSERT/UPDATE/DELETE 불가
