-- 시세 공급원 백필 자리(Q4). 평일 고시만 있는 합성 USD/KRW.
insert into app.fx_rates (base, quote, rate_date, rate)
select 'USD', 'KRW', d, round((1380 + 40 * sin(extract(doy from d) / 20.0))::numeric, 2)
from generate_series('2025-12-01'::date, '2026-11-30'::date, '1 day') d where extract(isodow from d) < 6;
