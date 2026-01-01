-- invitations (초대 코드)

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

-- 인덱스
create index invitations_code_idx on public.invitations(code);
create index invitations_household_id_idx on public.invitations(household_id);
