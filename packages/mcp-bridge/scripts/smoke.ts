import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadConfig } from "../src/config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../src/constants.js";

const config = loadConfig();

const client = new Client({
  name: `${PACKAGE_NAME}-smoke`,
  version: PACKAGE_VERSION,
});

const transport = new StreamableHTTPClientTransport(config.url, {
  requestInit: {
    headers: {
      Authorization: `Bearer ${config.token}`,
      "User-Agent": `${PACKAGE_NAME}-smoke/${PACKAGE_VERSION}`,
      "X-Oat-Mcp-Bridge": PACKAGE_NAME,
    },
  },
});
transport.setProtocolVersion(config.protocolVersion);

try {
  await client.connect(transport, { timeout: config.timeoutMs });
  const tools = await client.listTools(undefined, {
    timeout: config.timeoutMs,
  });
  process.stdout.write(
    `Connected to ${config.url.toString()} and found ${tools.tools.length} tools.\n`,
  );

  await client.callTool({ name: "get_context", arguments: {} }, undefined, {
    timeout: config.timeoutMs,
  });
  process.stdout.write("get_context smoke call succeeded.\n");
} finally {
  await client.close();
}
