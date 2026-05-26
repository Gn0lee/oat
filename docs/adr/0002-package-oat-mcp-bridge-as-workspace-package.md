# Package oat MCP bridge as a workspace package

oat exposes its real MCP server as the hosted Streamable HTTP endpoint at `/api/mcp`, but Claude Code, Codex, and Claude Desktop may still need a stdio MCP process to connect reliably. We will keep the Next.js app at the repository root and add only `packages/mcp-bridge` as a lightweight pnpm workspace package, published publicly as `@oat-app/mcp-bridge@0.1.0` under MIT.

The bridge is a transport adapter, not a second source of MCP tools: tokens remain env-only, auth and data access stay on the hosted oat server, and tool definitions are not duplicated in the package. It will use the official MCP TypeScript SDK for stdio/protocol behavior, default to `https://oat-blond.vercel.app/api/mcp` when `OAT_MCP_URL` is not set, support `OAT_MCP_DEBUG=1` for stderr-only diagnostics, and keep JSON-RPC response normalization in isolated modules with tests.

We are deliberately not moving the app into `apps/web` yet and not creating a shared package for MCP contracts. That avoids a broad repo migration and prevents the bridge from depending on oat server internals; if more packages or shared contracts appear later, the workspace can expand without changing this bridge boundary.
