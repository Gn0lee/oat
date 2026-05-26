import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { BridgeConfig } from "./config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import type { Logger } from "./logger.js";
import { RemoteMcpClient } from "./remote.js";

export async function runBridge(
  config: BridgeConfig,
  logger: Logger,
): Promise<void> {
  const remote = new RemoteMcpClient(config, logger);
  await remote.connect();

  const server = new Server(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, (request) =>
    remote.listTools(request.params),
  );
  server.setRequestHandler(CallToolRequestSchema, (request) =>
    remote.callTool(request.params),
  );

  const transport = new StdioServerTransport();
  transport.onerror = (error) => {
    logger.error("stdio transport error", { message: error.message });
  };

  const close = async () => {
    await server.close();
    await remote.close();
  };

  process.once("SIGINT", () => {
    close()
      .catch((error: unknown) => {
        logger.error("failed to close bridge", {
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => process.exit(0));
  });

  await server.connect(transport);
  logger.debug("stdio bridge started", { url: config.url.toString() });
}
