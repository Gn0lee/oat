-- Run after expand as the migration operator, outside a transaction; replay safe.
-- IF NOT EXISTS does not repair an INVALID index left by an interrupted build.
-- The final check halts in that case; inspect/drop that invalid index concurrently
-- and rerun, rather than silently continuing without a working index.
\set ON_ERROR_STOP on
\set AUTOCOMMIT on
set lock_timeout = '5s';
create index concurrently if not exists ledger_entries_household_book_transacted_at_idx
  on public.ledger_entries (household_id, book_id, transacted_at desc, id desc);
do $$
begin
  if not exists (select 1 from pg_catalog.pg_index
    where indexrelid = 'public.ledger_entries_household_book_transacted_at_idx'::regclass
      and indisvalid and indisready) then
    raise exception 'Ledger book/date index is invalid; inspect the interrupted concurrent build';
  end if;
end;
$$;
