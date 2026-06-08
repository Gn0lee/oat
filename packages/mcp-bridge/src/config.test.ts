import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";
import { DEFAULT_MCP_URL, DEFAULT_TIMEOUT_MS } from "./constants.js";

describe("loadConfig", () => {
  it("uses the hosted oat MCP URL by default", () => {
    const config = loadConfig({ OAT_MCP_TOKEN: "oat_mcp_test" });

    expect(config.url.toString()).toBe(DEFAULT_MCP_URL);
    expect(config.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(config.debug).toBe(false);
  });

  it("allows endpoint, timeout, cache, and debug overrides", () => {
    const config = loadConfig({
      OAT_MCP_TOKEN: "oat_mcp_test",
      OAT_MCP_URL: "https://preview.example.com/api/mcp",
      OAT_MCP_TIMEOUT_MS: "1000",
      OAT_MCP_CACHE_TTL_MS: "0",
      OAT_MCP_DEBUG: "1",
    });

    expect(config.url.toString()).toBe("https://preview.example.com/api/mcp");
    expect(config.timeoutMs).toBe(1000);
    expect(config.cacheTtlMs).toBe(0);
    expect(config.debug).toBe(true);
  });

  it("requires an MCP token", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ OAT_MCP_TOKEN: " " })).toThrow(
      "OAT_MCP_TOKEN is required.",
    );
  });

  it("requires a valid timeout", () => {
    expect(() =>
      loadConfig({
        OAT_MCP_TOKEN: "oat_mcp_test",
        OAT_MCP_TIMEOUT_MS: "0",
      }),
    ).toThrow("OAT_MCP_TIMEOUT_MS must be a positive integer.");
  });

  it("requires a valid cache TTL", () => {
    expect(() =>
      loadConfig({
        OAT_MCP_TOKEN: "oat_mcp_test",
        OAT_MCP_CACHE_TTL_MS: "-1",
      }),
    ).toThrow("OAT_MCP_CACHE_TTL_MS must be a non-negative integer.");
  });
});
