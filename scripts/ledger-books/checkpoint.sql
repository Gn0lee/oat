-- Run before and after the backfill as the privileged migration operator.
-- Capture stdout to separate secure, access-restricted files; do not commit
-- financial/user data. Compare by relation/key, excluding only entry book_id;
-- account for separately recorded legitimate concurrent creates/updates/deletes.
-- Run with psql -X -A -t -v ON_ERROR_STOP=1 -f this-file (no shared DB assumed).
\set ON_ERROR_STOP on
begin isolation level repeatable read read only;
select jsonb_build_object('relation', relation, 'row', data)
from (
  select 'households' as relation, to_jsonb(h) as data from public.households h
  union all select 'household_members', to_jsonb(m) from public.household_members m
  union all select 'ledger_entries', to_jsonb(e) - 'book_id' from public.ledger_entries e
  union all select 'ledger_entry_tags', to_jsonb(t) from public.ledger_entry_tags t
  union all select 'ledger_tags', to_jsonb(t) from public.ledger_tags t
  union all select 'accounts', to_jsonb(a) from public.accounts a
  union all select 'payment_methods', to_jsonb(p) from public.payment_methods p
  union all select 'record_change_requests', to_jsonb(r) from public.record_change_requests r
) checkpoint order by relation, data::text;
commit;
