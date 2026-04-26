-- 기존 가구에 시스템 카테고리 백필
-- categories 테이블 생성(20260423) 이전에 만들어진 가구들을 대상으로 seed 함수 호출
DO $$
DECLARE
  hh RECORD;
BEGIN
  FOR hh IN
    SELECT h.id
    FROM public.households h
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories c WHERE c.household_id = h.id
    )
  LOOP
    PERFORM public.seed_household_categories(hh.id);
  END LOOP;
END;
$$;
