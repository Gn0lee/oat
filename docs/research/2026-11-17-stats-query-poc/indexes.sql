-- 7절에 있는 인덱스(+ FK 인덱스)만
create index on records(household_id, ledger_id, date, sort_time, id);
create index on legs(household_id, wallet_id);
create index on legs(household_id, record_id);
create index on lines(household_id, record_id);
create index on lines(household_id, origin_record_id);
create index on lines(household_id, category_id);
