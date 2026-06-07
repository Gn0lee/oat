#!/usr/bin/env node

import { runBridge } from "./bridge.js";
import { loadConfig } from "./config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import { createLogger } from "./logger.js";

function printHelp() {
  process.stdout.write(`${PACKAGE_NAME} ${PACKAGE_VERSION}

Usage:
  npx -y ${PACKAGE_NAME}

Environment:
  OAT_MCP_TOKEN       Required oat MCP token.
  OAT_MCP_URL         Optional endpoint override.
  OAT_MCP_DEBUG       Set to 1 for stderr debug logs.
  OAT_MCP_TIMEOUT_MS  Optional request timeout in milliseconds.
  OAT_MCP_CACHE_TTL_MS Optional low-risk tool cache TTL. Set 0 to disable.
`);
}

async function main() {
  const [arg] = process.argv.slice(2);

  if (arg === "--help" || arg === "-h") {
    printHelp();
    return;
  }

  if (arg === "--version" || arg === "-v") {
    process.stdout.write(`${PACKAGE_VERSION}\n`);
    return;
  }

  if (arg) {
    process.stderr.write(`Unknown argument: ${arg}\n`);
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const logger = createLogger(config.debug);
  await runBridge(config, logger);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `[oat-mcp-bridge] ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
