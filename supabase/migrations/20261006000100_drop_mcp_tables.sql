-- #446: MCP server, tokens UI and bridge were removed from the app (user
-- decision 2026-10-05, MCP unused). Drop the leftover tables. Irreversible:
-- token hashes and audit rows are discarded on purpose.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

drop table public.mcp_audit_logs;
drop table public.mcp_tokens;
