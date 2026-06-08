import type { ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, vi } from "vitest";
import { CachedRemoteMcpClient } from "./cache.js";

function createRemote() {
  const remote = {
    callTool: vi.fn(async (params: { name: string; arguments?: unknown }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: params.name,
            arguments: params.arguments ?? {},
            calledAt: Date.now(),
          }),
        },
      ],
    })),
  };

  return remote as {
    callTool: ReturnType<
      typeof vi.fn<
        (params: { name: string; arguments?: unknown }) => Promise<ServerResult>
      >
    >;
  };
}

describe("CachedRemoteMcpClient", () => {
  it("caches low-risk tool calls within their TTL", async () => {
    const remote = createRemote();
    const client = new CachedRemoteMcpClient(remote, {
      now: () => 1_000,
      cacheTtlMs: undefined,
    });

    const first = await client.callTool({ name: "get_context", arguments: {} });
    const second = await client.callTool({
      name: "get_context",
      arguments: {},
    });

    expect(first).toBe(second);
    expect(remote.callTool).toHaveBeenCalledOnce();
  });

  it("bypasses cached values when forceRefresh is true", async () => {
    const remote = createRemote();
    const client = new CachedRemoteMcpClient(remote, {
      now: () => 1_000,
      cacheTtlMs: undefined,
    });

    await client.callTool({ name: "list_references", arguments: {} });
    await client.callTool({
      name: "list_references",
      arguments: { forceRefresh: true },
    });

    expect(remote.callTool).toHaveBeenCalledTimes(2);
    expect(remote.callTool).toHaveBeenLastCalledWith({
      name: "list_references",
      arguments: {},
    });
  });

  it("does not cache detailed data tools", async () => {
    const remote = createRemote();
    const client = new CachedRemoteMcpClient(remote, {
      now: () => 1_000,
      cacheTtlMs: undefined,
    });

    await client.callTool({ name: "search_ledger_entries", arguments: {} });
    await client.callTool({ name: "search_ledger_entries", arguments: {} });

    expect(remote.callTool).toHaveBeenCalledTimes(2);
  });

  it("can disable call caching with a zero TTL override", async () => {
    const remote = createRemote();
    const client = new CachedRemoteMcpClient(remote, {
      now: () => 1_000,
      cacheTtlMs: 0,
    });

    await client.callTool({ name: "get_context", arguments: {} });
    await client.callTool({ name: "get_context", arguments: {} });

    expect(remote.callTool).toHaveBeenCalledTimes(2);
  });
});
