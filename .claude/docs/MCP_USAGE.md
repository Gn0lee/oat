# MCP_USAGE.md

> oat MCP v0 배포 후 테스트와 기본 사용법입니다.

## 배포 후 체크리스트

1. Supabase 마이그레이션이 배포 DB에 적용됐는지 확인합니다.
   - `mcp_tokens`
   - `mcp_audit_logs`

2. 앱 환경변수를 확인합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL`

3. 앱에서 토큰을 발급합니다.
   - 경로: `/settings/mcp`
   - 토큰은 생성 직후 한 번만 표시됩니다.
   - 테스트 후 노출된 토큰은 회수하고 새로 발급합니다.

4. MCP endpoint health check를 확인합니다.

```bash
curl -i https://YOUR_DOMAIN/api/mcp
```

성공 시 `oat MCP`, `v0`, `streamable-http` 정보가 JSON으로 반환됩니다.

## 기본 테스트

아래 예시의 `YOUR_DOMAIN`과 `YOUR_TOKEN`을 교체합니다.

### Initialize

```bash
curl -i -X POST https://YOUR_DOMAIN/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "0" }
    }
  }'
```

### Tool 목록

```bash
curl -i -X POST https://YOUR_DOMAIN/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

v0 tool:

- `get_context`
- `get_financial_overview`
- `list_references`
- `search_ledger_entries`
- `get_ledger_stats`
- `get_asset_snapshot`

### Tool 호출

```bash
curl -i -X POST https://YOUR_DOMAIN/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_context",
      "arguments": {}
    }
  }'
```

## MCP 클라이언트 연결

stdio MCP 클라이언트는 npm bridge 패키지를 통해 oat hosted MCP endpoint에 연결합니다.

패키지:

```text
@oat-app/mcp-bridge
```

기본 endpoint:

```text
https://oat-blond.vercel.app/api/mcp
```

환경변수:

```text
OAT_MCP_TOKEN       필수. /settings/mcp에서 발급한 토큰
OAT_MCP_URL         선택. preview/staging endpoint override
OAT_MCP_DEBUG       선택. 1이면 stderr debug 로그 출력
OAT_MCP_TIMEOUT_MS  선택. 기본 30000
```

토큰은 command args로 받지 않습니다.

### Claude Code

Claude Code는 `claude mcp add`로 stdio server를 등록합니다.

```bash
claude mcp add oat \
  --transport stdio \
  --env OAT_MCP_TOKEN=oat_mcp_xxx \
  -- npx -y @oat-app/mcp-bridge
```

확인:

```bash
claude mcp list
claude mcp get oat
```

배포 전에는 npm 패키지 대신 빌드된 로컬 CLI를 등록해서 테스트합니다.

```bash
pnpm --filter @oat-app/mcp-bridge build
```

```bash
claude mcp add oat-local \
  --transport stdio \
  --env OAT_MCP_TOKEN=oat_mcp_xxx \
  --env OAT_MCP_DEBUG=1 \
  -- node /Users/jinho/project/oat-287/packages/mcp-bridge/dist/index.js
```

확인:

```bash
claude mcp list
claude mcp get oat-local
```

테스트 후 제거:

```bash
claude mcp remove oat-local
```

### Codex

Codex는 `~/.codex/config.toml`의 `mcp_servers`에 stdio server를 등록합니다.

```toml
[mcp_servers.oat]
command = "npx"
args = ["-y", "@oat-app/mcp-bridge"]
env = { OAT_MCP_TOKEN = "oat_mcp_xxx" }
```

배포 전에는 npm 패키지 대신 빌드된 로컬 CLI를 등록해서 테스트합니다.

```bash
pnpm --filter @oat-app/mcp-bridge build
```

```toml
[mcp_servers.oat-local]
command = "node"
args = ["/Users/jinho/project/oat-287/packages/mcp-bridge/dist/index.js"]
env = { OAT_MCP_TOKEN = "oat_mcp_xxx", OAT_MCP_DEBUG = "1" }
```

새 Codex 세션을 시작한 뒤 oat MCP tool 목록 조회나 `get_context` 호출을 요청합니다. 테스트 후 `oat-local` 설정은 제거합니다.

### ChatGPT

ChatGPT는 stdio bridge 패키지를 실행하지 않습니다. ChatGPT 테스트는 hosted remote MCP endpoint를 직접 대상으로 합니다.

```text
https://oat-blond.vercel.app/api/mcp
```

현재 oat v0는 personal bearer token 방식이므로, 배포 전 ChatGPT 경로 검증은 OpenAI Responses API의 remote MCP tool 테스트가 가장 명확합니다.

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.1",
    "input": "Use the oat MCP server to list available tools, then call get_context.",
    "tools": [
      {
        "type": "mcp",
        "server_label": "oat",
        "server_url": "https://oat-blond.vercel.app/api/mcp",
        "authorization": "Bearer oat_mcp_xxx"
      }
    ]
  }'
```

ChatGPT 웹 custom connector도 같은 remote endpoint를 사용합니다. 다만 connector 설정에서 bearer token을 remote MCP server에 전달할 수 없으면 oat v0에서는 정상 제약입니다. ChatGPT 웹 connector의 완전 지원은 OAuth 기반 MCP auth 단계에서 다룹니다.

### Claude Desktop

`claude_desktop_config.json`의 `mcpServers`에 추가합니다.

```json
{
  "mcpServers": {
    "oat": {
      "command": "npx",
      "args": ["-y", "@oat-app/mcp-bridge"],
      "env": {
        "OAT_MCP_TOKEN": "oat_mcp_xxx"
      }
    }
  }
}
```

### Preview endpoint

상용 endpoint가 아닌 preview 배포를 테스트할 때만 `OAT_MCP_URL`을 추가합니다.

```json
{
  "env": {
    "OAT_MCP_TOKEN": "oat_mcp_xxx",
    "OAT_MCP_URL": "https://YOUR_PREVIEW_DOMAIN/api/mcp"
  }
}
```

## Bridge 패키지 배포

패키지는 `packages/mcp-bridge`에서 관리하고 npm에는 `@oat-app/mcp-bridge`로 공개 배포합니다.

배포 전 검증:

```bash
pnpm mcp-bridge:prepublish
```

실제 endpoint smoke test:

```bash
OAT_MCP_TOKEN=oat_mcp_xxx pnpm --filter @oat-app/mcp-bridge smoke
```

Codex 로컬 CLI 테스트:

```bash
pnpm --filter @oat-app/mcp-bridge build
```

`~/.codex/config.toml`:

```toml
[mcp_servers.oat-local]
command = "node"
args = ["/Users/jinho/project/oat-287/packages/mcp-bridge/dist/index.js"]
env = { OAT_MCP_TOKEN = "oat_mcp_xxx", OAT_MCP_DEBUG = "1" }
```

ChatGPT/Responses API remote MCP 테스트:

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.1",
    "input": "Use the oat MCP server to list available tools, then call get_context.",
    "tools": [
      {
        "type": "mcp",
        "server_label": "oat",
        "server_url": "https://oat-blond.vercel.app/api/mcp",
        "authorization": "Bearer oat_mcp_xxx"
      }
    ]
  }'
```

배포:

```bash
npm whoami
pnpm mcp-bridge:publish
```

주의:

- `@oat-app` npm scope에 publish 권한이 있어야 합니다.
- npm 2FA가 켜져 있으면 publish 단계에서 OTP가 필요할 수 있습니다.
- publish 전 `pack --dry-run`으로 npm tarball에 `dist`, `README.md`, `LICENSE`만 포함되는지 확인합니다.

## 보안 주의사항

- 토큰을 로그, 문서, 채팅에 남기지 않습니다.
- 노출된 토큰은 `/settings/mcp`에서 즉시 회수합니다.
- v0는 read-only입니다.
- 파트너 개인 가계부 상세는 반환하지 않고, 집계에만 포함합니다.
- 서버는 모든 MCP tool 호출을 `mcp_audit_logs`에 기록합니다.
