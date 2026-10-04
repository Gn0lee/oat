-- Book actions use the same household -> ordered book locks as entry writes.
-- Explicit authorization is required because the definer can access the private
-- lock helpers; callers never select an actor or household themselves.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.mutate_ledger_book(
  p_book_id uuid, p_action text, p_name text default null
) returns public.ledger_books
language plpgsql security definer set search_path = '' as $$
declare
  book public.ledger_books;
  actor uuid := auth.uid();
  is_owner boolean;
begin
  select * into book from public.ledger_books where id = p_book_id;
  if not found or actor is null or not public.is_household_member(book.household_id)
    or (book.visibility = 'personal' and book.created_by is distinct from actor) then
    raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE';
  end if;

  perform ledger_books_private.lock_books(book.household_id, null);
  perform 1 from public.household_members
    where household_id = book.household_id and user_id = actor for share;
  if not found then
    raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE';
  end if;
  select * into book from public.ledger_books where id = p_book_id;
  if not found or (book.visibility = 'personal' and book.created_by is distinct from actor) then
    raise exception using errcode = '42501', message = 'BOOK_UNAVAILABLE';
  end if;
  is_owner := public.is_household_owner(book.household_id);

  if p_action not in ('rename', 'archive', 'reactivate', 'delete') or p_action is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_action = 'delete' and book.created_by is distinct from actor
    and not (book.visibility = 'shared' and is_owner) then
    raise exception using errcode = '42501', message = 'BOOK_ACTION_FORBIDDEN';
  end if;
  if p_action <> 'reactivate' and book.archived_at is not null then
    raise exception using errcode = '23514', message = 'BOOK_ARCHIVED';
  end if;
  if p_action in ('archive', 'delete') and book.is_default then
    raise exception using errcode = '23514', message = 'BOOK_DEFAULT_REQUIRED';
  end if;

  if p_action = 'rename' then
    if p_name is null or btrim(p_name) = '' then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
    end if;
    update public.ledger_books set name = btrim(p_name) where id = book.id returning * into book;
  elsif p_action = 'archive' then
    update public.ledger_books set archived_at = now() where id = book.id returning * into book;
  elsif p_action = 'reactivate' then
    -- Already active is an idempotent success (the archived trigger permits
    -- only reactivation without changing any other book properties).
    if book.archived_at is not null then
      update public.ledger_books set archived_at = null where id = book.id returning * into book;
    end if;
  else
    -- The guard + FK check emptiness and legacy protection while locked.
    delete from public.ledger_books where id = book.id returning * into book;
  end if;
  return book;
end;
$$;
revoke all on function public.mutate_ledger_book(uuid, text, text) from public, anon;
grant execute on function public.mutate_ledger_book(uuid, text, text) to authenticated;
