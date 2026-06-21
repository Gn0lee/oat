alter table public.categories
  add column parent_id uuid references public.categories(id) on delete restrict;

alter table public.categories
  add constraint categories_parent_not_self_check
  check (parent_id is null or parent_id <> id);

alter table public.categories
  drop constraint categories_household_id_type_name_key;

create unique index categories_parent_name_unique_idx
  on public.categories (household_id, type, lower(name))
  where parent_id is null;

create unique index categories_child_name_unique_idx
  on public.categories (parent_id, lower(name))
  where parent_id is not null;

create index categories_parent_id_idx on public.categories(parent_id);
