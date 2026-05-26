import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  CallToolRequest,
  ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { BridgeConfig } from "./config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import type { Logger } from "./logger.js";

export class RemoteMcpClient {
  private readonly client: Client;
  private readonly transport: StreamableHTTPClientTransport;

  constructor(
    private readonly config: BridgeConfig,
    private readonly logger: Logger,
  ) {
    this.client = new Client({
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
    });

    this.transport = new StreamableHTTPClientTransport(config.url, {
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.token}`,
          "User-Agent": config.userAgent,
          "X-Oat-Mcp-Bridge": PACKAGE_NAME,
        },
      },
    });
    this.transport.setProtocolVersion(config.protocolVersion);
  }

  async connect(): Promise<void> {
    const startedAt = Date.now();
    this.logger.debug("connecting remote MCP", {
      url: this.config.url.toString(),
      timeoutMs: this.config.timeoutMs,
    });

    await this.client.connect(this.transport, {
      timeout: this.config.timeoutMs,
    });

    this.logger.debug("connected remote MCP", {
      durationMs: Date.now() - startedAt,
    });
  }

  async close(): Promise<void> {
    try {
      await this.transport.terminateSession();
    } catch {
      // The oat v0 endpoint is stateless and may not support session DELETE.
    }

    await this.client.close();
  }

  async listTools(params?: ListToolsRequest["params"]) {
    const startedAt = Date.now();
    const result = await this.client.listTools(params, {
      timeout: this.config.timeoutMs,
    });

    this.logger.debug("forwarded tools/list", {
      durationMs: Date.now() - startedAt,
      toolCount: result.tools.length,
    });

    return result;
  }

  async callTool(params: CallToolRequest["params"]) {
    const startedAt = Date.now();
    const result = await this.client.callTool(params, undefined, {
      timeout: this.config.timeoutMs,
    });

    this.logger.debug("forwarded tools/call", {
      durationMs: Date.now() - startedAt,
      toolName: params.name,
    });

    return result;
  }
}
