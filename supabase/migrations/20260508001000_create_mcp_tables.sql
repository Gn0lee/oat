-- MCP v0: personal read-only tokens and audit logs

create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  token_hash text not null unique,
  token_prefix text not null,
  token_last4 text not null,
  scopes text[] not null,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index mcp_tokens_user_household_idx
  on public.mcp_tokens(user_id, household_id);

create index mcp_tokens_token_hash_idx
  on public.mcp_tokens(token_hash);

create table public.mcp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.mcp_tokens(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  tool_name text not null,
  input_summary jsonb,
  result_status text not null,
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index mcp_audit_logs_user_household_created_idx
  on public.mcp_audit_logs(user_id, household_id, created_at desc);

create index mcp_audit_logs_token_created_idx
  on public.mcp_audit_logs(token_id, created_at desc);

alter table public.mcp_tokens enable row level security;
alter table public.mcp_audit_logs enable row level security;

-- No direct client policies in v0.
-- Token management and MCP access go through server routes with explicit user/household checks.
