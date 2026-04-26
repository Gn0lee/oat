-- category-icons.ts가 PascalCase(lucide-react 컴포넌트명)를 사용하도록 변경됨에 따라
-- 기존 시스템 카테고리 아이콘명과 seed 함수를 일괄 업데이트한다.
--
-- 변경 목록:
--   'utensils'        → 'Utensils'
--   'home'            → 'House'       (아이콘 변경)
--   'car'             → 'Car'
--   'zap'             → 'Zap'
--   'shield'          → 'Shield'
--   'stethoscope'     → 'Stethoscope'
--   'book-open'       → 'BookOpen'
--   'shopping-cart'   → 'ShoppingCart'
--   'clapperboard'    → 'Clapperboard'
--   'sparkles'        → 'Sparkles'
--   'repeat'          → 'Repeat'
--   'gift'            → 'Gift'
--   'piggy-bank'      → 'PiggyBank'
--   'package'         → 'Package'
--   'briefcase'       → 'Briefcase'
--   'laptop'          → 'Laptop'
--   'trending-up'     → 'TrendingUp'
--   'rotate-ccw'      → 'RotateCcw'
--   'heart-handshake' → 'HeartHandshake'

-- ============================================================
-- 1. 기존 시스템 카테고리 아이콘 일괄 업데이트
-- ============================================================

update public.categories
set icon = case icon
  when 'utensils'        then 'Utensils'
  when 'home'            then 'House'
  when 'car'             then 'Car'
  when 'zap'             then 'Zap'
  when 'shield'          then 'Shield'
  when 'stethoscope'     then 'Stethoscope'
  when 'book-open'       then 'BookOpen'
  when 'shopping-cart'   then 'ShoppingCart'
  when 'clapperboard'    then 'Clapperboard'
  when 'sparkles'        then 'Sparkles'
  when 'repeat'          then 'Repeat'
  when 'gift'            then 'Gift'
  when 'piggy-bank'      then 'PiggyBank'
  when 'package'         then 'Package'
  when 'briefcase'       then 'Briefcase'
  when 'laptop'          then 'Laptop'
  when 'trending-up'     then 'TrendingUp'
  when 'rotate-ccw'      then 'RotateCcw'
  when 'heart-handshake' then 'HeartHandshake'
  else icon
end
where is_system = true
  and icon in (
    'utensils', 'home', 'car', 'zap', 'shield', 'stethoscope',
    'book-open', 'shopping-cart', 'clapperboard', 'sparkles',
    'repeat', 'gift', 'piggy-bank', 'package', 'briefcase',
    'laptop', 'trending-up', 'rotate-ccw', 'heart-handshake'
  );

-- ============================================================
-- 2. seed_household_categories 함수 업데이트 (신규 가구용)
-- ============================================================

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
    (hh_id, 'expense', '저축/투자',     'PiggyBank',    13, true),
    (hh_id, 'expense', '기타',          'Package',      14, true),
    -- 수입 카테고리
    (hh_id, 'income',  '급여',          'Briefcase',    1,  true),
    (hh_id, 'income',  '부수입',        'Laptop',       2,  true),
    (hh_id, 'income',  '이자/배당',     'TrendingUp',   3,  true),
    (hh_id, 'income',  '환급',          'RotateCcw',    4,  true),
    (hh_id, 'income',  '용돈/선물',     'HeartHandshake', 5, true),
    (hh_id, 'income',  '기타',          'Package',      6,  true);
end;
$$;
