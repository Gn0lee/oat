-- search_stocks: 종목 검색 RPC 함수
-- 티커, 종목명, 초성 검색 지원 (GIN 인덱스 활용)
-- 정렬은 클라이언트에서 처리

create or replace function public.search_stocks(
  search_query text,
  market_filter market_type default null,
  result_limit int default 50
)
returns setof public.stock_master
language sql
stable
security definer
as $$
  select *
  from public.stock_master
  where
    is_active = true
    and is_suspended = false
    and (market_filter is null or market = market_filter)
    and (
      code ilike trim(search_query) || '%'
      or name ilike '%' || trim(search_query) || '%'
      or name_en ilike '%' || trim(search_query) || '%'
      or choseong like trim(search_query) || '%'
    )
  limit result_limit;
$$;

comment on function public.search_stocks is '종목 검색: 티커, 종목명, 초성 검색 지원';
