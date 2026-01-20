-- search_stocks 함수 개선: 띄어쓰기 무시, 특수문자 무시, 초성 중간 검색 지원
create or replace function public.search_stocks(
  search_query text,
  market_filter market_type default null,
  result_limit int default 50
)
returns setof public.stock_master
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select regexp_replace(trim(search_query), '[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g') as query,
           -- 영문 키보드 오타 변환 (주요 초성 매핑 예시)
           translate(
             trim(search_query),
             'rRsSeEfFaAqQtTdDwWczvxg',
             'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
           ) as converted_query
  )
  select s.*
  from public.stock_master s, normalized n
  where
    s.is_active = true
    and s.is_suspended = false
    and (market_filter is null or s.market = market_filter)
    and (
      -- 1. 코드 매칭 (앞부분)
      s.code ilike n.query || '%'
      -- 2. 실제 이름에 검색어가 그대로 포함된 경우 (공백 유지)
      or s.name ilike '%' || search_query || '%'
      or s.name_en ilike '%' || search_query || '%'
      -- 3. 초성 매칭 (직접 입력 또는 영한 변환)
      or s.choseong ilike '%' || n.query || '%'
      or s.choseong ilike '%' || n.converted_query || '%'
      -- 4. 공백 제거 매칭 (검색어가 3글자 이상일 때만 허용하여 노이즈 감소)
      or (
        length(n.query) >= 3 and (
          regexp_replace(s.name, '[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g') ilike '%' || n.query || '%'
          or regexp_replace(s.name_en, '[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g') ilike '%' || n.query || '%'
        )
      )
    )
  limit result_limit;
$$;
