import {
  isJsonRpcResponse,
  type JsonRpcId,
  type JsonRpcResponse,
  jsonRpcError,
} from "./json-rpc.js";

export function normalizeRemoteResponse(
  requestId: JsonRpcId,
  bodyText: string,
): JsonRpcResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return jsonRpcError(
      requestId,
      -32603,
      "oat MCP server returned a non-JSON response.",
    );
  }

  if (isJsonRpcResponse(parsed)) {
    return parsed;
  }

  return jsonRpcError(
    requestId,
    -32603,
    "oat MCP server returned an invalid JSON-RPC response.",
  );
}
