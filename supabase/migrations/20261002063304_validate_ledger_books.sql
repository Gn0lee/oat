-- Stage 3a: apply only AFTER scripts/ledger-books/reconcile.sql passes, including
-- the separately retained checkpoint and concurrent writes comparison.
-- Validation takes SHARE UPDATE EXCLUSIVE, permitting normal entry writes.
set local lock_timeout = '5s';
select ledger_books_private.assert_reconciled(true);
alter table public.ledger_entries validate constraint ledger_entries_household_book_fkey;
alter table public.ledger_entries validate constraint ledger_entries_book_id_not_null;
