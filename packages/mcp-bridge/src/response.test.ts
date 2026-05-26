import { describe, expect, it } from "vitest";
import { normalizeRemoteResponse } from "./response.js";

describe("normalizeRemoteResponse", () => {
  it("passes through valid JSON-RPC results", () => {
    const response = normalizeRemoteResponse(
      1,
      JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } }),
    );

    expect(response).toEqual({ jsonrpc: "2.0", id: 1, result: { ok: true } });
  });

  it("passes through valid JSON-RPC errors", () => {
    const response = normalizeRemoteResponse(
      1,
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32000, message: "Unauthorized" },
      }),
    );

    expect(response.error?.message).toBe("Unauthorized");
  });

  it("wraps non-JSON responses", () => {
    const response = normalizeRemoteResponse(1, "<html>error</html>");

    expect(response.error?.code).toBe(-32603);
    expect(response.error?.message).toContain("non-JSON");
  });

  it("wraps JSON that is not JSON-RPC", () => {
    const response = normalizeRemoteResponse(1, JSON.stringify({ ok: false }));

    expect(response.error?.code).toBe(-32603);
    expect(response.error?.message).toContain("invalid JSON-RPC");
  });
});
