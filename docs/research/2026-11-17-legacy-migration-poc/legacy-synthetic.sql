-- 기존 oat 스키마(supabase/migrations 전체 적용)에 합성 데이터를 넣는다.
-- 가계부 기록은 기존 앱의 쓰기 함수(write_ledger_entry)를 그대로 불러서, 저장 잔액이 실제 앱과 똑같이 움직이게 한다.
-- 주식 거래·잔액 맞춤은 앱(TS)이 하던 일(lib/api/transaction.ts, balance-adjustment.ts)을 SQL로 흉내 낸다.
-- 특이 케이스: 잔액 미관리 계좌, 출처 없는 지출, 연결 통장 없는 체크카드, 체크카드 비지출 출금,
-- 같은 카드사·결제일 카드 두 장, 결제일 없는 카드, 매도 후 재매수, 같은 날 매도 먼저 입력, 0원 매수, USD 소수점 매매.
\set ON_ERROR_STOP 1
select setseed(0.527);
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

-- 사용자 A, B (가입 트리거가 프로필·가구·기본 카테고리·기본 장부를 만든다)
insert into auth.users (id, email, raw_user_meta_data, created_at) values
 ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com', '{"name":"가나"}', '2025-12-20 10:00+09'),
 ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com', '{"name":"다라"}', '2025-12-21 10:00+09'),
 ('cccccccc-0000-0000-0000-000000000003', 'c@example.com', '{"name":"마바"}', '2025-12-22 10:00+09');

-- B를 A의 가구로 옮긴다(초대 수락과 같은 결과)
do $$
declare hb uuid; ha uuid;
begin
  select household_id into ha from household_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  select household_id into hb from household_members where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  delete from household_members where household_id = hb;
  delete from households where id = hb;
  insert into household_members (household_id, user_id, role, joined_at) values (ha, 'bbbbbbbb-0000-0000-0000-000000000002', 'member', '2025-12-23 10:00+09');
end $$;

create temp table ids(k text primary key, id uuid);

do $$
declare
  ha uuid; a uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; b uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  hc uuid; c uuid := 'cccccccc-0000-0000-0000-000000000003';
  v uuid;
begin
  select household_id into ha from household_members where user_id = a;
  select household_id into hc from household_members where user_id = c;
  insert into ids values ('ha', ha), ('hc', hc), ('a', a), ('b', b), ('c', c);
  insert into ids select 'book_shared', id from ledger_books where household_id = ha and is_default;
  insert into ids select 'book_c', id from ledger_books where household_id = hc and is_default;
  insert into ledger_books (household_id, name, visibility, created_by, created_at) values (ha, '가나 개인', 'personal', a, '2025-12-24') returning id into v; insert into ids values ('book_a', v);
  insert into ledger_books (household_id, name, visibility, created_by, created_at) values (ha, '여행 2026', 'shared', a, '2025-12-24') returning id into v; insert into ids values ('book_trip', v);
  -- B는 개인 장부가 없다(이관이 만들어야 함)

  -- 계좌
  insert into accounts (household_id, owner_id, name, category, account_type, balance, is_household_usable, created_at) values (ha, a, '생활비 통장', 'bank', 'checking', 1500000, true, '2025-12-25') returning id into v; insert into ids values ('acc_living', v);
  insert into accounts (household_id, owner_id, name, category, account_type, balance, created_at) values (ha, a, '청년 적금', 'bank', 'savings', 3000000, '2025-12-25') returning id into v; insert into ids values ('acc_saving', v);
  insert into accounts (household_id, owner_id, name, category, account_type, balance, created_at) values (ha, a, '비상금 통장', 'bank', 'checking', null, '2025-12-25') returning id into v; insert into ids values ('acc_untracked', v);
  insert into accounts (household_id, owner_id, name, category, account_type, balance, created_at) values (ha, b, '다라 월급 통장', 'bank', 'checking', 800000, '2025-12-26') returning id into v; insert into ids values ('acc_b', v);
  insert into accounts (household_id, owner_id, name, broker, category, account_type, balance, created_at) values (ha, a, '가나 증권', '토스증권', 'investment', 'stock', 0, '2025-12-26') returning id into v; insert into ids values ('acc_stock_a', v);
  insert into accounts (household_id, owner_id, name, broker, category, account_type, balance, created_at) values (ha, b, '다라 ISA', '미래에셋', 'investment', 'isa', null, '2025-12-26') returning id into v; insert into ids values ('acc_isa_b', v);
  insert into accounts (household_id, owner_id, name, category, account_type, balance, created_at) values (hc, c, '마바 통장', 'bank', 'checking', 200000, '2025-12-26') returning id into v; insert into ids values ('acc_c', v);

  -- 결제수단
  insert into payment_methods (household_id, owner_id, name, type, issuer, payment_day, is_household_usable, created_at) values (ha, a, '신한 Deep', 'credit_card', '신한카드', 14, true, '2025-12-27') returning id into v; insert into ids values ('pm_shinhan1', v);
  insert into payment_methods (household_id, owner_id, name, type, issuer, payment_day, created_at) values (ha, a, '신한 가족카드', 'credit_card', '신한카드', 14, '2025-12-27') returning id into v; insert into ids values ('pm_shinhan2', v);
  insert into payment_methods (household_id, owner_id, name, type, issuer, payment_day, created_at) values (ha, b, '현대 M', 'credit_card', '현대카드', null, '2025-12-27') returning id into v; insert into ids values ('pm_hyundai', v);
  insert into payment_methods (household_id, owner_id, name, type, issuer, linked_account_id, created_at) values (ha, a, '국민 체크', 'debit_card', 'KB국민', (select id from ids where k='acc_living'), '2025-12-27') returning id into v; insert into ids values ('pm_debit_a', v);
  insert into payment_methods (household_id, owner_id, name, type, issuer, created_at) values (ha, b, '연결 안 된 체크', 'debit_card', '우리', '2025-12-27') returning id into v; insert into ids values ('pm_debit_b', v);
  insert into payment_methods (household_id, owner_id, name, type, balance, created_at) values (ha, a, '네이버페이', 'prepaid', 50000, '2025-12-27') returning id into v; insert into ids values ('pm_npay', v);
  insert into payment_methods (household_id, owner_id, name, type, balance, created_at) values (ha, a, '온누리상품권', 'gift_card', null, '2025-12-27') returning id into v; insert into ids values ('pm_gift', v);
  insert into payment_methods (household_id, owner_id, name, type, balance, created_at) values (ha, b, '지갑 현금', 'cash', 30000, '2025-12-27') returning id into v; insert into ids values ('pm_cash', v);
end $$;

-- 가계부 기록: 기존 쓰기 함수로 만든다
create or replace function pg_temp.w(actor text, book text, payload jsonb, at timestamptz) returns uuid language plpgsql as $$
declare r ledger_entries; uid uuid;
begin
  select id into uid from ids where k = actor;
  r := write_ledger_entry('create', uid, payload || jsonb_build_object('bookId', (select id from ids where k = book),
    'householdId', (select household_id from ledger_books where id = (select id from ids where k = book))));
  update ledger_entries set created_at = at, updated_at = at where id = r.id;  -- UUIDv7 시각 검증용으로 생성 시각을 흩뿌린다
  return r.id;
end $$;

create or replace function pg_temp.cat(h text, nm text, t text) returns uuid language sql as $$
  select id from categories where household_id = (select id from ids where k = h) and name = nm and type = t::category_type limit 1 $$;
create or replace function pg_temp.id(key text) returns uuid language sql as $$ select id from ids where k = key $$;

do $$
declare
  d date; i int; n int; amt int; src jsonb; actor text; book text; catname text;
  exp_cats text[] := array['식비','교통비','쇼핑','여가/문화','의료비','미용','공과금','구독/정기결제'];
  srcs_a text[] := array['pm_shinhan1','pm_shinhan2','pm_debit_a','pm_npay','acc_living','none','pm_gift'];
  srcs_b text[] := array['pm_hyundai','pm_debit_b','pm_cash','acc_b','none','pm_shinhan1'];
  s text; ts timestamptz;
begin
  for d in select generate_series('2026-01-01'::date, '2026-10-31'::date, '1 day')::date loop
    n := (random() * 3)::int;
    for i in 1..n loop
      if random() < 0.55 then actor := 'a'; s := srcs_a[1 + (random() * (array_length(srcs_a,1)-1))::int];
      else actor := 'b'; s := srcs_b[1 + (random() * (array_length(srcs_b,1)-1))::int]; end if;
      book := case when random() < 0.75 then 'book_shared' when actor = 'a' and random() < 0.7 then 'book_a' when random() < 0.5 then 'book_trip' else 'book_shared' end;
      -- 개인 장부에서는 남의 수단을 쓸 수 없다(기존 규칙)
      if book = 'book_a' and s in ('pm_hyundai','pm_debit_b','pm_cash','acc_b') then s := 'pm_shinhan1'; end if;
      if actor = 'b' and s = 'pm_shinhan1' and book <> 'book_shared' and book <> 'book_trip' then s := 'pm_hyundai'; end if;
      amt := (500 + random() * 80000)::int / 10 * 10;
      catname := exp_cats[1 + (random() * (array_length(exp_cats,1)-1))::int];
      src := case when s = 'none' then '{}'::jsonb
                  when s like 'acc_%' then jsonb_build_object('fromAccountId', pg_temp.id(s))
                  else jsonb_build_object('fromPaymentMethodId', pg_temp.id(s)) end;
      ts := d + time '08:00' + (random() * interval '14 hours');
      perform pg_temp.w(actor, book, jsonb_build_object('type','expense','amount',amt,'transactedAt', d::text || 'T00:00:00.000Z',
        'title', catname || ' ' || i, 'categoryId', pg_temp.cat('ha', catname, 'expense'),
        'tags', case when random() < 0.1 then '["주말"]'::jsonb else '[]'::jsonb end) || src, ts);
    end loop;

    if extract(day from d) = 25 then  -- 월급
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','income','amount',3200000,'transactedAt',d::text||'T00:00:00.000Z','title','급여','categoryId',pg_temp.cat('ha','급여','income'),'toAccountId',pg_temp.id('acc_living')), d + time '09:10');
      perform pg_temp.w('b','book_shared', jsonb_build_object('type','income','amount',2800000,'transactedAt',d::text||'T00:00:00.000Z','title','급여','categoryId',pg_temp.cat('ha','급여','income'),'toAccountId',pg_temp.id('acc_b')), d + time '09:20');
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','income','amount',70000,'transactedAt',d::text||'T00:00:00.000Z','title','통신비 지원','categoryId',pg_temp.cat('ha','부수입','income'),'toAccountId',pg_temp.id('acc_living')), d + time '09:30');
      perform pg_temp.w('a','book_a', jsonb_build_object('type','income','amount',50000,'transactedAt',d::text||'T00:00:00.000Z','title','용돈','categoryId',pg_temp.cat('ha','용돈/선물','income'),'toAccountId',pg_temp.id('acc_untracked')), d + time '09:40');
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','transfer','amount',500000,'transactedAt',d::text||'T00:00:00.000Z','title','적금','fromAccountId',pg_temp.id('acc_living'),'toAccountId',pg_temp.id('acc_saving')), d + time '10:00');
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','transfer','amount',100000,'transactedAt',d::text||'T00:00:00.000Z','title','페이 충전','fromAccountId',pg_temp.id('acc_living'),'toPaymentMethodId',pg_temp.id('pm_npay')), d + time '10:05');
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','transfer','amount',1000000,'transactedAt',d::text||'T00:00:00.000Z','title','투자금','fromAccountId',pg_temp.id('acc_living'),'toAccountId',pg_temp.id('acc_stock_a')), d + time '10:10');
    end if;
    if extract(day from d) = 14 then  -- 카드대금: 카드와 연결 없는 비지출 출금
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','non_expense_withdrawal','amount',(600000 + random()*400000)::int,'transactedAt',d::text||'T00:00:00.000Z','title','신한카드 대금','fromAccountId',pg_temp.id('acc_living')), d + time '07:00');
      perform pg_temp.w('b','book_shared', jsonb_build_object('type','non_expense_withdrawal','amount',(300000 + random()*300000)::int,'transactedAt',d::text||'T00:00:00.000Z','title','현대카드','fromAccountId',pg_temp.id('acc_b')), d + time '07:05');
      perform pg_temp.w('a','book_shared', jsonb_build_object('type','non_expense_withdrawal','amount',20000,'transactedAt',d::text||'T00:00:00.000Z','title','체크로 ATM 출금','fromPaymentMethodId',pg_temp.id('pm_debit_a')), d + time '07:10');
    end if;
    if extract(day from d) = 3 then  -- 다른 가구
      perform pg_temp.w('c','book_c', jsonb_build_object('type','expense','amount',12000,'transactedAt',d::text||'T00:00:00.000Z','title','점심','categoryId',pg_temp.cat('hc','식비','expense'),'fromAccountId',pg_temp.id('acc_c')), d + time '12:00');
    end if;
  end loop;
end $$;

-- 잔액 맞춤(앱이 하던 일: 이전 잔액·실제 잔액·차이를 남기고 잔액을 실제로 바꾼다)
do $$
declare prev numeric;
begin
  select balance into prev from accounts where id = pg_temp.id('acc_living');
  insert into balance_adjustments (household_id, owner_id, target_type, account_id, previous_balance, actual_balance, delta, adjusted_at, created_at)
    values (pg_temp.id('ha'), pg_temp.id('a'), 'account', pg_temp.id('acc_living'), prev, prev - 12340, -12340, '2026-06-30 21:00+09', '2026-06-30 21:00+09');
  update accounts set balance = prev - 12340 where id = pg_temp.id('acc_living');
  select balance into prev from payment_methods where id = pg_temp.id('pm_cash');
  insert into balance_adjustments (household_id, owner_id, target_type, payment_method_id, previous_balance, actual_balance, delta, adjusted_at, created_at)
    values (pg_temp.id('ha'), pg_temp.id('b'), 'payment_method', pg_temp.id('pm_cash'), prev, 5000, 5000 - prev, '2026-08-01 20:00+09', '2026-08-01 20:00+09');
  update payment_methods set balance = 5000 where id = pg_temp.id('pm_cash');
end $$;

-- 주식 종목 설정과 거래
insert into household_stock_settings (household_id, ticker, name, market, currency, risk_level) values
 (pg_temp.id('ha'), '005930', '삼성전자', 'KR', 'KRW', 'moderate'),
 (pg_temp.id('ha'), '069500', 'KODEX 200', 'KR', 'KRW', 'safe'),
 (pg_temp.id('ha'), 'AAPL', 'Apple', 'US', 'USD', 'moderate'),
 (pg_temp.id('ha'), 'QQQ', 'Invesco QQQ', 'US', 'USD', 'aggressive');

create or replace function pg_temp.trade(acc text, tk text, ty text, q numeric, p numeric, d date, at timestamptz) returns void language plpgsql as $$
declare v_acc accounts;
begin
  select * into v_acc from accounts where id = pg_temp.id(acc);
  insert into transactions (household_id, owner_id, account_id, ticker, type, quantity, price, transacted_at, created_at)
    values (v_acc.household_id, v_acc.owner_id, v_acc.id, tk, ty::transaction_type, q, p, (d::text || 'T00:00:00.000Z')::timestamptz, at);
  -- 앱과 같이 통화 환산 없이 ∓수량×가격, 잔액이 NULL이면 건너뜀
  update accounts set balance = balance + case when ty = 'buy' then -q*p else q*p end where id = v_acc.id and balance is not null;
end $$;

select pg_temp.trade('acc_stock_a','005930','buy', 10, 70000, '2026-01-15', '2026-01-15 20:00+09');
select pg_temp.trade('acc_stock_a','005930','sell', 10, 75000, '2026-03-10', '2026-03-10 20:00+09');   -- 전량 매도
select pg_temp.trade('acc_stock_a','005930','buy', 10, 80000, '2026-04-02', '2026-04-02 20:00+09');    -- 재매수: 기존 평단 75,000 vs 이동평균 80,000
select pg_temp.trade('acc_stock_a','069500','buy', 20, 35000, '2026-02-03', '2026-02-03 20:00+09');
select pg_temp.trade('acc_stock_a','069500','sell', 5, 36000, '2026-05-03', '2026-05-03 20:00+09');
select pg_temp.trade('acc_stock_a','069500','buy', 5, 38000, '2026-06-03', '2026-06-03 20:00+09');    -- 부분 매도 후 매수
select pg_temp.trade('acc_stock_a','AAPL','buy', 1.5, 180.25, '2026-02-10', '2026-02-10 23:40+09');
select pg_temp.trade('acc_stock_a','AAPL','buy', 0.012345, 212.34, '2026-03-11', '2026-03-11 23:40+09'); -- 소수점: 현금 다리 반올림
select pg_temp.trade('acc_stock_a','AAPL','sell', 0.5, 190.1, '2026-05-20', '2026-05-20 23:40+09');
select pg_temp.trade('acc_isa_b','QQQ','buy', 3, 450.00, '2026-03-02', '2026-03-02 23:30+09');
-- 같은 날 매도를 먼저 입력하고 매수를 나중에 입력(수량은 마지막에 맞지만 정렬 키 순서로는 음수)
select pg_temp.trade('acc_isa_b','QQQ','sell', 5, 470.00, '2026-07-07', '2026-07-07 22:00+09');
select pg_temp.trade('acc_isa_b','QQQ','buy', 4, 468.00, '2026-07-07', '2026-07-07 22:05+09');
select pg_temp.trade('acc_isa_b','069500','buy', 3, 0, '2026-08-08', '2026-08-08 10:00+09');          -- 0원 매수(이벤트 지급 주식 등)

-- 현재 환율 한 줄과 종가(기존 화면 재현용)
insert into exchange_rates (from_currency, to_currency, rate) values ('USD','KRW',1385.5) on conflict do nothing;
