import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Database } from "@/types";
import type { McpAuthContext } from "./auth";
import { executeMcpTool, MCP_TOOL_DEFINITIONS } from "./tools";

type LooseSupabaseClient = SupabaseClient<Database> | Record<string, never>;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

interface HandleMcpJsonRpcParams {
  message: JsonRpcRequest;
  supabase: LooseSupabaseClient;
  auth: McpAuthContext;
}

export interface McpJsonRpcResponse {
  status: number;
  body: Record<string, unknown> | null;
}

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      data,
    },
  };
}

function toToolContent(result: unknown) {
  return [
    {
      type: "text",
      text: JSON.stringify(result, null, 2),
    },
  ];
}

function getToolCallParams(params: unknown): {
  name: string;
  arguments: Record<string, unknown>;
} {
  const value = params as { name?: unknown; arguments?: unknown } | null;

  if (!value || typeof value.name !== "string") {
    throw new APIError(
      "MCP_INVALID_REQUEST",
      "MCP tool 이름이 필요합니다.",
      400,
    );
  }

  return {
    name: value.name,
    arguments:
      value.arguments && typeof value.arguments === "object"
        ? (value.arguments as Record<string, unknown>)
        : {},
  };
}

export async function handleMcpJsonRpc({
  message,
  supabase,
  auth,
}: HandleMcpJsonRpcParams): Promise<McpJsonRpcResponse> {
  if (message.id === undefined || message.id === null) {
    return { status: 202, body: null };
  }

  try {
    switch (message.method) {
      case "initialize":
        return {
          status: 200,
          body: jsonRpcResult(message.id, {
            protocolVersion: "2025-06-18",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "oat",
              version: "0.1.0",
            },
          }),
        };

      case "tools/list":
        return {
          status: 200,
          body: jsonRpcResult(message.id, {
            tools: MCP_TOOL_DEFINITIONS,
          }),
        };

      case "tools/call": {
        const tool = getToolCallParams(message.params);
        const result = await executeMcpTool(
          supabase as SupabaseClient<Database>,
          auth,
          tool.name,
          tool.arguments,
        );

        return {
          status: 200,
          body: jsonRpcResult(message.id, {
            content: toToolContent(result),
          }),
        };
      }

      default:
        return {
          status: 200,
          body: jsonRpcError(
            message.id,
            -32601,
            `Unsupported MCP method: ${message.method ?? "unknown"}`,
          ),
        };
    }
  } catch (error) {
    if (error instanceof APIError) {
      return {
        status: 200,
        body: jsonRpcError(message.id, -32000, error.message, {
          code: error.code,
          statusCode: error.statusCode,
        }),
      };
    }

    console.error("MCP JSON-RPC error:", error);
    return {
      status: 200,
      body: jsonRpcError(message.id, -32603, "Internal MCP server error"),
    };
  }
}
