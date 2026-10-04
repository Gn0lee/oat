-- Run immediately before ANY #440 migration, as the privileged migration operator.
-- Uses only baseline tables; replay before/after expansion is safe. Capture the
-- secure checkpoint too. Failure means stop, never auto-correct or broaden access.
\set ON_ERROR_STOP on
begin isolation level repeatable read read only;
do $$
begin
  if exists (select 1 from public.ledger_entries e where not exists (
    select 1 from public.household_members m where m.household_id = e.household_id and m.user_id = e.owner_id
  )) then
    raise exception 'LEDGER_OWNER_NOT_MEMBER';
  end if;
  if exists (select 1 from public.ledger_entries e where e.amount <= 0
    or e.amount::text in ('NaN', 'Infinity', '-Infinity') or not isfinite(e.transacted_at)) then
    raise exception 'LEDGER_INVALID_ORIGINAL_MONEY_OR_DATE';
  end if;
  if exists (select 1 from public.ledger_entries e
    join public.categories c on c.id = e.category_id where c.household_id <> e.household_id) then
    raise exception 'LEDGER_CATEGORY_HOUSEHOLD_MISMATCH';
  end if;
  -- Historical permissions may have changed; only structural integrity is a
  -- migration invariant. Current source authorization is checked on new money writes.
  if exists (
    select 1 from public.ledger_entries e
    cross join lateral unnest(array[e.from_account_id,e.to_account_id]) ref(id)
    left join public.accounts a on a.id = ref.id
    where ref.id is not null and (a.id is null or a.household_id <> e.household_id)
  ) or exists (
    select 1 from public.ledger_entries e
    cross join lateral unnest(array[e.from_payment_method_id,e.to_payment_method_id]) ref(id)
    left join public.payment_methods pm on pm.id = ref.id
    where ref.id is not null and (pm.id is null or pm.household_id <> e.household_id)
  ) or exists (
    select 1 from public.payment_methods pm
    left join public.accounts a on a.id = pm.linked_account_id
    where pm.linked_account_id is not null and (a.id is null or a.household_id <> pm.household_id)
  ) then
    raise exception 'LEDGER_FINANCIAL_HOUSEHOLD_MISMATCH';
  end if;
  if exists (
    select 1 from public.ledger_entry_tags link
    left join public.ledger_entries e on e.id = link.ledger_entry_id
    left join public.ledger_tags t on t.id = link.tag_id
    where e.id is null or t.id is null or e.household_id <> link.household_id or t.household_id <> link.household_id
  ) then
    raise exception 'LEDGER_TAG_HOUSEHOLD_MISMATCH';
  end if;
  if exists (
    select 1 from public.record_change_requests r
    left join (
      select id, household_id, owner_id, is_shared, 'ledger_entry' as target_type from public.ledger_entries
      union all select id, household_id, owner_id, true, 'stock_transaction' from public.transactions
    ) target on target.id = r.target_id and target.target_type = r.target_type::text
    where r.status = 'pending' and (
      target.id is null or target.household_id <> r.household_id or target.owner_id <> r.target_owner_id
      or not target.is_shared or not exists (select 1 from public.household_members m
        where m.household_id = r.household_id and m.user_id = r.requester_id)
      or not exists (select 1 from public.household_members m
        where m.household_id = r.household_id and m.user_id = r.target_owner_id)
    )
  ) then
    raise exception 'PENDING_RECORD_REQUEST_RELATIONSHIP_ANOMALY';
  end if;
end;
$$;
select count(*) as households from public.households;
select count(*) as entries, count(*) filter (where is_shared) as shared_entries,
  count(*) filter (where not is_shared) as personal_entries,
  count(*) filter (where to_jsonb(e)->>'book_id' is null) as entries_to_backfill
from public.ledger_entries e;
select target_type, count(*) as pending_requests from public.record_change_requests
where status = 'pending' group by target_type order by target_type;
commit;
