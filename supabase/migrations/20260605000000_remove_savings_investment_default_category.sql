-- Remove the ambiguous default expense category that caused tracked transfers
-- and investment account funding to be recorded as expenses.

delete from public.categories
where type = 'expense'
  and name = '저축/투자'
  and is_system = true;

create or replace function public.seed_household_categories(hh_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (household_id, type, name, icon, display_order, is_system)
  values
    -- 지출 카테고리
    (hh_id, 'expense', '식비',         'Utensils',     1,  true),
    (hh_id, 'expense', '주거비',        'House',        2,  true),
    (hh_id, 'expense', '교통비',        'Car',          3,  true),
    (hh_id, 'expense', '공과금',        'Zap',          4,  true),
    (hh_id, 'expense', '보험료',        'Shield',       5,  true),
    (hh_id, 'expense', '의료비',        'Stethoscope',  6,  true),
    (hh_id, 'expense', '교육비',        'BookOpen',     7,  true),
    (hh_id, 'expense', '쇼핑',          'ShoppingCart', 8,  true),
    (hh_id, 'expense', '여가/문화',     'Clapperboard', 9,  true),
    (hh_id, 'expense', '미용',          'Sparkles',     10, true),
    (hh_id, 'expense', '구독/정기결제', 'Repeat',       11, true),
    (hh_id, 'expense', '경조사',        'Gift',         12, true),
    (hh_id, 'expense', '기타',          'Package',      13, true),
    -- 수입 카테고리
    (hh_id, 'income',  '급여',          'Briefcase',    1,  true),
    (hh_id, 'income',  '부수입',        'Laptop',       2,  true),
    (hh_id, 'income',  '이자/배당',     'TrendingUp',   3,  true),
    (hh_id, 'income',  '환급',          'RotateCcw',    4,  true),
    (hh_id, 'income',  '용돈/선물',     'HeartHandshake', 5, true),
    (hh_id, 'income',  '기타',          'Package',      6,  true);
end;
$$;
