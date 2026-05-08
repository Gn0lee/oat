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

원격 MCP URL은 다음 형식입니다.

```text
https://YOUR_DOMAIN/api/mcp
```

인증 헤더:

```text
Authorization: Bearer YOUR_TOKEN
```

클라이언트가 protocol version을 설정할 수 있으면 다음 값을 사용합니다.

```text
MCP-Protocol-Version: 2025-06-18
```

## 보안 주의사항

- 토큰을 로그, 문서, 채팅에 남기지 않습니다.
- 노출된 토큰은 `/settings/mcp`에서 즉시 회수합니다.
- v0는 read-only입니다.
- 파트너 개인 가계부 상세는 반환하지 않고, 집계에만 포함합니다.
- 서버는 모든 MCP tool 호출을 `mcp_audit_logs`에 기록합니다.
