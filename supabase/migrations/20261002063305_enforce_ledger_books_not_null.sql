-- Stage 3b: a separate commit after online validation. The validated CHECK lets
-- SET NOT NULL skip another heap scan; fail quickly and retry if DDL is busy.
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$
begin
  if (select count(*) from pg_catalog.pg_constraint
    where conrelid = 'public.ledger_entries'::regclass and convalidated
      and conname in ('ledger_entries_household_book_fkey', 'ledger_entries_book_id_not_null')) <> 2 then
    raise exception 'Ledger book constraints must be validated before SET NOT NULL';
  end if;
end;
$$;
alter table public.ledger_entries alter column book_id set not null;
-- Keep the compatibility guard and is_shared until the separately authorized
-- final release gate confirms that legacy clients are no longer writing.
