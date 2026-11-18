-- 새 DB(PG18)에서 기존 DB를 legacy 스키마로 읽는다. 이관 보조 테이블과 함수도 여기서 만든다.
\set ON_ERROR_STOP 1
create extension if not exists postgres_fdw;
drop server if exists legacy_srv cascade;
create server legacy_srv foreign data wrapper postgres_fdw options (host :'legacy_host', port :'legacy_port', dbname 'postgres');
create user mapping for current_user server legacy_srv options (user 'postgres', password :'legacy_password');
drop schema if exists legacy cascade;
create schema legacy;
import foreign schema public limit to (
  profiles, households, household_members, ledger_books, accounts, payment_methods, categories,
  ledger_entries, balance_adjustments, transactions, household_stock_settings, holdings
) from server legacy_srv into legacy;

drop schema if exists mig cascade;
create schema mig;
-- 기존 id → 새 id
create table mig.map (src text not null, legacy_id uuid not null, new_id uuid not null, primary key (src, legacy_id));
-- 이관이 새로 만든 행(출처 미지정 지갑, 개인 장부, 맞춤 기록)과 보고 항목
create table mig.report (household_id uuid, item text, detail jsonb);

-- UUIDv7을 주어진 시각으로 직접 조립한다: 48비트 unix ms + 버전 7 + ms 아래 12비트(약 0.24µs 단위, RFC 9562 방식 3) + 변형 비트 + 난수.
-- uuidv7(시각 − clock_timestamp())는 함수 안에서 시계를 다시 읽어 호출마다 몇 µs씩 어긋나서 쓰지 않는다.
create function mig.v7(ts timestamptz) returns uuid language sql volatile as $$
  select (lpad(to_hex(ms), 12, '0') || '7' || lpad(to_hex(frac), 3, '0')
          || to_hex(8 + floor(random() * 4)::int) || substr(md5(random()::text || clock_timestamp()::text), 1, 15))::uuid
  from (select floor(extract(epoch from ts) * 1000)::bigint ms,
               floor((extract(epoch from ts) * 1000 - floor(extract(epoch from ts) * 1000)) * 4096)::int frac) t $$;
create function mig.id(s text, lid uuid) returns uuid language sql stable as $$ select new_id from mig.map where src = s and legacy_id = lid $$;
create function mig.kst_date(ts timestamptz) returns date language sql immutable as $$ select (ts at time zone 'Asia/Seoul')::date $$;
-- 절댓값 기준 사사오입(물리 스키마 4.3)
create function mig.round_away(x numeric) returns bigint language sql immutable as $$ select (sign(x) * round(abs(x)))::bigint $$;
create function mig.minor_digits(cur text) returns int language sql immutable as $$ select case cur when 'USD' then 2 else 0 end $$;
