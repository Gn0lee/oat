-- Run as the migration operator after BOTH backfill progress counts reach zero.
-- Also compare the secure checkpoint captures and account for concurrent writes:
-- IDs, original entry fields/timestamps/visibility, tags and balances must match.
-- This script verifies relationships and mapping; it cannot infer concurrent intent.
\set ON_ERROR_STOP on
begin isolation level repeatable read read only;
select ledger_books_private.assert_reconciled(true);
select b.visibility, count(*) as entries from public.ledger_entries e
join public.ledger_books b on b.household_id = e.household_id and b.id = e.book_id
group by b.visibility order by b.visibility;
select count(distinct h.id) as households, count(*) filter (where b.is_default) as defaults
from public.households h join public.ledger_books b on b.household_id = h.id;
commit;
