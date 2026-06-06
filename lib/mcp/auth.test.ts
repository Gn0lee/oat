import { describe, expect, it } from "vitest";
import {
  createMcpTokenSecret,
  DEFAULT_MCP_TOKEN_TTL_DAYS,
  getMcpTokenExpiresAt,
  hashMcpToken,
  parseBearerToken,
  shouldRefreshMcpTokenLastUsedAt,
  toMcpTokenPreview,
} from "./auth";

describe("MCP auth helpers", () => {
  it("creates an oat MCP token with previewable prefix and last4", () => {
    const token = createMcpTokenSecret();

    expect(token).toMatch(/^oat_mcp_[A-Za-z0-9_-]{32,}$/);
    expect(toMcpTokenPreview(token)).toEqual({
      prefix: "oat_mcp",
      last4: token.slice(-4),
    });
  });

  it("hashes tokens without returning the raw token", () => {
    const token = "oat_mcp_test_token";
    const hash = hashMcpToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
    expect(hashMcpToken(token)).toBe(hash);
  });

  it("parses bearer tokens and rejects malformed headers", () => {
    expect(parseBearerToken("Bearer oat_mcp_abc")).toBe("oat_mcp_abc");
    expect(parseBearerToken("bearer oat_mcp_abc")).toBe("oat_mcp_abc");
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("oat_mcp_abc")).toBeNull();
    expect(parseBearerToken("Bearer")).toBeNull();
  });

  it("defaults token expiry to 90 days", () => {
    const now = new Date("2026-05-08T00:00:00.000Z");
    const expiresAt = getMcpTokenExpiresAt(now);

    expect(DEFAULT_MCP_TOKEN_TTL_DAYS).toBe(90);
    expect(expiresAt).toBe("2026-08-06T00:00:00.000Z");
  });

  it("throttles last_used_at refreshes", () => {
    const now = new Date("2026-06-06T12:00:00.000Z");

    expect(shouldRefreshMcpTokenLastUsedAt(null, now)).toBe(true);
    expect(shouldRefreshMcpTokenLastUsedAt("invalid", now)).toBe(true);
    expect(
      shouldRefreshMcpTokenLastUsedAt("2026-06-06T11:50:01.000Z", now),
    ).toBe(false);
    expect(
      shouldRefreshMcpTokenLastUsedAt("2026-06-06T11:45:00.000Z", now),
    ).toBe(true);
  });
});
