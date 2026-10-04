-- Run repeatedly as service_role (or the migration owner). Each invocation
-- commits one small batch. NEVER use psql --single-transaction or wrap runs in BEGIN.
-- Even a zero SKIP LOCKED batch is not completion: check BOTH counts and reconcile.
\set ON_ERROR_STOP on
\set AUTOCOMMIT on
set lock_timeout = '5s';
select public.backfill_ledger_books(500) as entries_backfilled;
select (select count(*) from public.ledger_entries where book_id is null) as remaining_null_entries,
  (select count(*) from public.households h where not exists (
    select 1 from public.ledger_books b where b.household_id = h.id
      and b.is_default and b.visibility = 'shared' and b.archived_at is null
  )) as households_without_active_shared_default;
