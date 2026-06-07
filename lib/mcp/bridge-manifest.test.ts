import { describe, expect, it } from "vitest";
import { MCP_TOOL_DEFINITIONS } from "@/lib/mcp/tools";
import { BRIDGE_TOOL_DEFINITIONS } from "@/packages/mcp-bridge/src/manifest";

describe("bridge MCP manifest", () => {
  it("stays aligned with the hosted MCP tool definitions", () => {
    expect(BRIDGE_TOOL_DEFINITIONS).toEqual(MCP_TOOL_DEFINITIONS);
  });
});
