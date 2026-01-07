-- search_stocks 함수에 search_path 보안 설정 추가
-- Supabase Security Advisor: Function has a role mutable search_path
-- 참고: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

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
