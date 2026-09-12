# Phase 2 API, MCP, DB hosting paths

## Question

How can oat keep the Next.js web app on Vercel while moving API, MCP, or database load to a home server, and what authentication, security, cost, latency, and operations boundaries does each path create?

This is a decision input, not a final architecture. The previous Vercel cost spike cannot be attributed from repository code alone; billing and request telemetry must be checked before migration.

## Current boundaries

oat is a single Next.js 16 application with 62 Route Handlers. Most browser data requests use same-origin `/api/...` endpoints, while seven server-rendered pages, four auth Server Actions, and several browser auth components also create Supabase clients directly. Supabase Auth sessions are shared between browser and server through cookies, and `proxy.ts` refreshes those cookies. Moving only `app/api` therefore does not remove Vercel-to-Supabase traffic or Supabase Auth from Vercel. It changes only one of several data paths. [Server client](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/lib/supabase/server.ts), [session proxy](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/lib/supabase/middleware.ts), [browser client](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/lib/supabase/client.ts)

Authorization is substantially implemented in PostgreSQL: the migrations contain RLS policies, helper functions, triggers, and views. User-scoped server clients carry the Supabase JWT so RLS can authorize rows. Admin clients use the secret key and bypass RLS, including MCP authentication and price-cache writes. Any replacement with plain PostgreSQL plus another auth system must recreate this authorization boundary explicitly; copying tables is not enough. [RLS migrations](https://github.com/Gn0lee/oat/tree/96021d84a891936604327c618713610755b3eb62/supabase/migrations), [admin client](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/lib/supabase/admin.ts)

MCP is already the cleanest movable unit. The published stdio bridge accepts `OAT_MCP_URL` and sends a dedicated Bearer token to `/api/mcp`; the endpoint authenticates that token with an admin client, checks household membership and scopes, and writes audit records. It does not depend on the web session cookie. The bridge already answers the static tool manifest locally, avoiding repeated `tools/list` Vercel and Supabase calls. [MCP ADR](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/docs/adr/0002-package-oat-mcp-bridge-as-workspace-package.md), [hosted endpoint](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/app/api/mcp/route.ts), [bridge configuration](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/packages/mcp-bridge/src/config.ts)

Stock prices are refreshed on demand and cached in Supabase in one-hour buckets; cache misses can call KIS during a user request. Exchange rates, stock master data, and market holidays are separate scheduled GitHub Actions jobs. These are independent workload boundaries: moving MCP does not move price refresh, and moving scheduled jobs is unnecessary unless their runner limits, secrets, or latency become a problem. [Stock price service](https://github.com/Gn0lee/oat/blob/96021d84a891936604327c618713610755b3eb62/lib/api/stock-price.ts), [scheduled workflows](https://github.com/Gn0lee/oat/tree/96021d84a891936604327c618713610755b3eb62/.github/workflows)

## Candidate paths

| Path | What moves | Cost effect | Latency effect | Main work and risk |
| --- | --- | --- | --- | --- |
| Measure and tune current deployment | Nothing | Can identify whether invocations, active CPU, provisioned memory, transfer, MCP polling, or Supabase egress/size is the limiting metric | Function region and slow queries may explain current feedback without migration | Lowest risk; it does not increase capacity |
| Move MCP first | `/api/mcp` runtime and its secrets; bridge URL points to home server | Removes MCP request compute from Vercel; Supabase database and egress remain | MCP client to home server to Supabase adds one network path; web latency is unchanged | Smallest boundary because Bearer auth is already independent; expose only this endpoint with TLS, rate limits, logs, and audit retention |
| Move API and MCP, keep Supabase Cloud | Most Route Handlers plus MCP | Reduces Vercel function work, but Vercel SSR/Actions and all database/auth egress remain | Browser-to-home-to-Supabase may be slower or faster depending on uplink and regions; SSR still uses Vercel-to-Supabase | Requires a stable API host, auth-token forwarding, CORS/CSRF policy, and migration of many same-origin clients |
| Move API/MCP and self-host Supabase | API runtime, Postgres, Auth, PostgREST, and supporting Supabase services | Removes managed DB size/egress dependence and most Vercel function work; adds electricity, storage, backup, domain/TLS, and maintenance cost | Home API-to-home DB is short; Vercel SSR and browser Auth still cross the public internet unless their paths are redesigned | Preserves the closest match to current SDK, schema, RLS, and Auth model, but users must re-authenticate after migration and the operator owns backups and upgrades |
| Replace Supabase with PostgreSQL and other Auth | Database/Auth and data layer | Avoids Supabase service limits, with the same home operations costs | Can be fast within the home network | Largest rewrite: replace PostgREST client usage, cookie refresh, Auth flows, admin-key behavior, and RLS/JWT integration; no current evidence justifies it |
| Move the whole Next.js app home | Web, API, MCP, DB | Removes Vercel runtime use | Avoids Vercel-to-home SSR hops but makes all app availability depend on the home connection | Useful comparison baseline, but it conflicts with the stated preference to keep low-volume web delivery on Vercel |

Vercel Fluid Compute meters invocations, active CPU, and provisioned memory; I/O wait pauses active CPU billing but memory remains allocated while requests are in flight. Vercel recommends inspecting the Usage page over a 30-day window and breaking usage down by project and region before optimizing. [Fluid Compute pricing](https://vercel.com/docs/functions/usage-and-pricing), [usage management](https://vercel.com/docs/pricing/manage-and-optimize-usage)

Supabase Free currently includes 500 MB database size per project and 5 GB uncached egress per organization. Database size includes table data, indexes, and materialized views; disk usage also includes WAL and other files. A projected exhaustion date needs current database size, the largest relations, and growth over time, rather than transaction count alone. [Supabase billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase), [database and disk size](https://supabase.com/docs/guides/platform/database-size), [egress accounting](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

## Web/API split rules

### Same-origin proxy versus direct browser calls

An external rewrite can keep browser URLs under the Vercel origin while proxying to the home server. Next.js documents external rewrites as a URL proxy. This avoids changing every current `/api/...` caller and avoids browser CORS preflights, but the request still traverses Vercel, so it may continue to consume Vercel requests and transfer. It is useful as a migration shim, not as proof that Vercel cost has been removed. [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)

Direct browser calls to `https://api.example.com` bypass Vercel compute. They require explicit allowed origins, preflight handling, credentials policy, and a way to present the authenticated user. The home API should accept a short-lived Supabase access token in `Authorization`, validate it, and use the user context for RLS. It should not receive the Supabase refresh-token cookie, and the browser must never receive the admin/service secret. State-changing cookie-authenticated endpoints would also require CSRF protection. Bearer-token endpoints still need strict CORS because CORS controls browsers, not arbitrary clients.

Keeping browser calls same-origin is simpler for oat's current code. Therefore direct cross-origin API calls should be introduced only for endpoints whose measured volume or duration justifies the extra auth and CORS surface.

### SSR, Server Actions, and cookies

Supabase's Next.js SSR pattern stores sessions in cookies and uses Proxy to refresh tokens because Server Components cannot write response cookies. oat follows that pattern. Keeping Next.js on Vercel means login, refresh, server-rendered page reads, and auth Server Actions continue to involve Vercel and Supabase unless those features are rewritten. [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side), [Supabase Next.js guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

Server Actions are public POST endpoints and must perform authentication and authorization themselves. Next.js compares `Origin` with `Host` or `X-Forwarded-Host` for CSRF protection; proxy arrangements with different public and upstream domains may require a narrow `serverActions.allowedOrigins` configuration. Moving ordinary Route Handlers does not move Server Actions. [Next.js data security](https://nextjs.org/docs/app/guides/data-security), [Server Actions configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)

### MCP boundary

The first home deployment should expose only MCP under a dedicated hostname or path. Preserve the current opaque Bearer token, token hash storage, expiry, household membership check, scopes, origin rule, and audit log. Add a reverse proxy that terminates TLS, limits body size and request rate, and forwards the client IP deliberately. Do not expose Postgres, Studio, or the Supabase admin API to make MCP work. Rotate the MCP URL through `OAT_MCP_URL`, retain the Vercel endpoint as a rollback target for one release, and compare request count and latency before and after.

## Database and Auth migration boundary

Self-hosted Supabase is the least disruptive database-exit candidate because the official platform-to-self-hosted procedure exports roles, schema, and data, including `auth.users`, RLS policies, functions, and triggers. The self-hosted JWT secret differs, so existing sessions become invalid and users must sign in again. OAuth callback URLs and providers must also be updated. [Platform-to-self-hosted restore](https://supabase.com/docs/guides/self-hosting/restore-from-platform)

Self-hosting is not equivalent to exposing the CLI development stack. Supabase recommends Docker for production self-hosting, HTTPS in front of its gateway, and production SMTP for Auth email. Managed backups, PITR, advanced metrics, and platform support are absent; server patching, database maintenance, monitoring, backups, disaster recovery, and uptime become owner responsibilities. [Self-hosting overview](https://supabase.com/docs/guides/self-hosting), [Docker deployment](https://supabase.com/docs/guides/self-hosting/docker), [Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Before a database cutover, perform at least one disposable restore rehearsal, verify row counts and RLS with both user and admin clients, test signup/login/reset/invite flows, and run a rollback rehearsal. Keep the managed project unchanged until the restored instance passes those checks. A backup stored only on the mini PC is not a backup; maintain an encrypted copy on another device or service and periodically prove that it restores.

## Measurement needed before choosing

Collect a 30-day baseline and a short MCP load sample:

1. Vercel: invocation count by route, active CPU, provisioned memory, function duration, cold starts, transfer, errors, and p50/p95 response time. Correlate the previous spike with deployment date and MCP tool name if retained logs allow it.
2. Supabase: database size, top relations including indexes, daily or weekly growth, database/Auth egress, request counts, slow queries, connection count, and cache tables such as `stock_prices` and `mcp_audit_logs`.
3. End-to-end: from an iPhone on Wi-Fi and cellular, measure p50/p95 for login refresh, ledger list/search, ledger write, stock summary, and MCP calls. Separate browser-to-service, service-to-database, and external KIS time where logs permit.
4. Home server: outbound and inbound latency, upload bandwidth, TLS reachability, restart recovery, power interruption behavior, and restore time from the off-device backup.

The decision signal is the growth slope and traffic source. A full database migration is justified when measured storage or egress projects a concrete limit date and the operational rehearsal meets the required recovery target. An API migration is justified when specific Vercel routes dominate usage. A latency complaint alone does not identify the hosting tier: it may come from Vercel-to-database distance, database queries, KIS cache misses, sequential API calls, or the mobile client.

## Recommended route

1. Keep one repository. Deployment boundaries do not require repository boundaries; the existing workspace package and environment-specific entrypoints already support separate artifacts.
2. Measure the current deployment before changing topology. In parallel, verify that the Vercel function region is close to the current Supabase project; Vercel notes that physical distance to the data source affects response time. [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region)
3. Move MCP only to the home server as the first reversible experiment. It is the only existing boundary with independent Bearer auth and a configurable remote URL.
4. Keep Supabase Cloud during that experiment. Compare Vercel usage, Supabase egress, MCP p95 latency, failure rate, and home availability for at least one representative usage period.
5. If particular ordinary API routes dominate Vercel usage, move those routes individually. Prefer direct Bearer-authenticated calls for meaningful cost removal; use rewrites only as a transition or when same-origin behavior is worth the remaining Vercel path.
6. If database growth predicts the free limit will be reached, rehearse managed-to-self-hosted Supabase next. Preserve schema, RLS, and Auth before considering a plain PostgreSQL/Auth rewrite.

This route keeps the current web experience and avoids a broad auth rewrite. It also makes each step falsifiable: if MCP removal does not materially change cost, the measurements identify the next workload rather than committing oat to a larger migration.
