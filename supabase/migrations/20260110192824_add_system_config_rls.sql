-- system_config RLS 활성화
-- 서버 전용 테이블로, service_role만 접근 가능

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 모든 일반 사용자 접근 차단
-- service_role은 RLS를 bypass하므로 영향 없음
CREATE POLICY "No direct access to system_config"
  ON public.system_config FOR ALL
  USING (false);

COMMENT ON POLICY "No direct access to system_config" ON public.system_config
  IS 'system_config는 서버 전용 테이블입니다. service_role key로만 접근 가능합니다.';
