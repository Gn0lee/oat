export function isMcpEnabled(env = process.env): boolean {
  return env.MCP_ENABLED === "true";
}
