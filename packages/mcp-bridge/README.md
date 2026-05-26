# @oat-app/mcp-bridge

`@oat-app/mcp-bridge` connects stdio MCP clients to the hosted oat MCP endpoint.

The oat MCP server remains hosted at `https://oat-blond.vercel.app/api/mcp`.
This package is only a local transport bridge.

## Claude Code

```bash
claude mcp add oat \
  --transport stdio \
  --env OAT_MCP_TOKEN=oat_mcp_xxx \
  -- npx -y @oat-app/mcp-bridge
```

Use a preview endpoint only when needed:

```bash
claude mcp add oat-preview \
  --transport stdio \
  --env OAT_MCP_TOKEN=oat_mcp_xxx \
  --env OAT_MCP_URL=https://YOUR_PREVIEW_DOMAIN/api/mcp \
  -- npx -y @oat-app/mcp-bridge
```

Verify with:

```bash
claude mcp list
claude mcp get oat
```

## Generic MCP JSON

Use this form for clients that accept `mcpServers` JSON.

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

## Claude Desktop

Add the same server entry to `claude_desktop_config.json`.

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

## Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.oat]
command = "npx"
args = ["-y", "@oat-app/mcp-bridge"]
env = { OAT_MCP_TOKEN = "oat_mcp_xxx" }
```

## ChatGPT

ChatGPT does not use this stdio bridge package. For ChatGPT, test the hosted
remote MCP endpoint directly:

```text
https://oat-blond.vercel.app/api/mcp
```

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `OAT_MCP_TOKEN` | Yes | oat MCP token from `/settings/mcp` |
| `OAT_MCP_URL` | No | Endpoint override. Defaults to `https://oat-blond.vercel.app/api/mcp` |
| `OAT_MCP_DEBUG` | No | Set to `1` for stderr debug logs |
| `OAT_MCP_TIMEOUT_MS` | No | Request timeout. Defaults to `30000` |

Tokens are accepted only through environment variables. `--token` and `--url`
arguments are intentionally not supported.

## Debugging

```json
{
  "env": {
    "OAT_MCP_TOKEN": "oat_mcp_xxx",
    "OAT_MCP_DEBUG": "1"
  }
}
```

Debug logs are written to stderr. stdout is reserved for MCP protocol messages.
Token values are not printed.

## Local Smoke Test

```bash
OAT_MCP_TOKEN=oat_mcp_xxx pnpm --filter @oat-app/mcp-bridge smoke
```

Use `OAT_MCP_URL` to test a preview deployment.
