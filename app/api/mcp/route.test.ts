import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeMcpAuditLog } from "@/lib/mcp/audit";
import { authenticateMcpToken } from "@/lib/mcp/auth";
import { handleMcpJsonRpc } from "@/lib/mcp/protocol";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpToken: vi.fn(),
}));

vi.mock("@/lib/mcp/protocol", () => ({
  handleMcpJsonRpc: vi.fn(),
}));

vi.mock("@/lib/mcp/audit", () => ({
  writeMcpAuditLog: vi.fn(),
}));

const createAdminClientMock = vi.mocked(createAdminClient);
const authenticateMcpTokenMock = vi.mocked(authenticateMcpToken);
const handleMcpJsonRpcMock = vi.mocked(handleMcpJsonRpc);
const writeMcpAuditLogMock = vi.mocked(writeMcpAuditLog);

const admin = {};
const auth = {
  tokenId: "token-1",
  userId: "user-1",
  householdId: "household-1",
  scopes: ["read:overview"],
  authMethod: "personal_token" as const,
};

function createMcpRequest(message: unknown) {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer oat_mcp_test",
      "content-type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

describe("MCP route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAdminClientMock.mockReturnValue(admin as never);
    authenticateMcpTokenMock.mockResolvedValue(auth);
  });

  it("returns 202 for MCP notifications without authenticating", async () => {
    const response = await POST(
      createMcpRequest({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }) as never,
    );

    expect(response.status).toBe(202);
    expect(createAdminClientMock).not.toHaveBeenCalled();
    expect(authenticateMcpTokenMock).not.toHaveBeenCalled();
    expect(handleMcpJsonRpcMock).not.toHaveBeenCalled();
  });

  it("does not audit tools/list handshake requests", async () => {
    handleMcpJsonRpcMock.mockResolvedValue({
      status: 200,
      body: {
        jsonrpc: "2.0",
        id: 1,
        result: { tools: [] },
      },
    });

    const response = await POST(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(authenticateMcpTokenMock).toHaveBeenCalledOnce();
    expect(handleMcpJsonRpcMock).toHaveBeenCalledOnce();
    expect(writeMcpAuditLogMock).not.toHaveBeenCalled();
  });

  it("audits tool calls", async () => {
    handleMcpJsonRpcMock.mockResolvedValue({
      status: 200,
      body: {
        jsonrpc: "2.0",
        id: 2,
        result: { content: [] },
      },
    });

    const response = await POST(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_context", arguments: {} },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(writeMcpAuditLogMock).toHaveBeenCalledWith(admin, {
      auth,
      toolName: "get_context",
      inputSummary: expect.objectContaining({ hasQuery: false }),
      resultStatus: "success",
      durationMs: expect.any(Number),
    });
  });
});
