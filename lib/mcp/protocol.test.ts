import { describe, expect, it } from "vitest";
import { handleMcpJsonRpc } from "./protocol";

const auth = {
  tokenId: "token-1",
  userId: "user-1",
  householdId: "household-1",
  scopes: ["read:overview", "read:ledger", "read:assets", "read:references"],
  authMethod: "personal_token" as const,
};

describe("MCP JSON-RPC handler", () => {
  it("returns initialize capabilities", async () => {
    const response = await handleMcpJsonRpc({
      message: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18" },
      },
      supabase: {},
      auth,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "oat" },
      },
    });
  });

  it("lists v0 tools", async () => {
    const response = await handleMcpJsonRpc({
      message: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      },
      supabase: {},
      auth,
    });

    expect(response.body).not.toBeNull();
    const body = response.body as {
      result: { tools: { name: string }[] };
    };

    expect(body.result.tools.map((tool) => tool.name)).toEqual([
      "get_context",
      "get_financial_overview",
      "list_references",
      "get_money_endpoint_detail",
      "search_ledger_entries",
      "get_ledger_stats",
      "get_asset_snapshot",
      "create_ledger_entry",
      "update_ledger_entry",
      "delete_ledger_entry",
    ]);
  });

  it("returns 202 for notifications without a body", async () => {
    const response = await handleMcpJsonRpc({
      message: {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      },
      supabase: {},
      auth,
    });

    expect(response).toEqual({ status: 202, body: null });
  });
});
