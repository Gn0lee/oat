import { describe, expect, it } from "vitest";
import {
  buildMcpMeta,
  clampLedgerLimit,
  isLedgerEntryVisibleToMcp,
  MCP_TOOL_DEFINITIONS,
  normalizeMcpPeriod,
} from "./tools";

describe("MCP tool helpers", () => {
  it("exposes the v0 read-only tool set", () => {
    expect(MCP_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      "get_context",
      "get_financial_overview",
      "list_references",
      "search_ledger_entries",
      "get_ledger_stats",
      "get_asset_snapshot",
    ]);
  });

  it("defaults the period to the current month and caps explicit ranges", () => {
    const now = new Date("2026-05-08T09:00:00.000Z");

    expect(normalizeMcpPeriod({}, now)).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });

    expect(
      normalizeMcpPeriod({ from: "2025-01-01", to: "2026-05-31" }, now),
    ).toEqual({
      from: "2025-06-01",
      to: "2026-05-31",
    });
  });

  it("caps ledger entry result limits at 100", () => {
    expect(clampLedgerLimit(undefined)).toBe(50);
    expect(clampLedgerLimit(10)).toBe(10);
    expect(clampLedgerLimit(500)).toBe(100);
  });

  it("includes scope and privacy metadata in tool responses", () => {
    expect(
      buildMcpMeta({
        period: { from: "2026-05-01", to: "2026-05-31" },
        scopes: ["read:ledger"],
      }),
    ).toEqual({
      period: { from: "2026-05-01", to: "2026-05-31" },
      scope: ["read:ledger"],
      privacy: {
        included: ["shared ledger details", "own private ledger details"],
        aggregatedOnly: ["partner private expenses"],
        excluded: ["partner private expense details"],
      },
      limits: {
        maxLedgerEntries: 100,
        maxStatsMonths: 12,
      },
    });
  });

  it("only exposes shared ledger entries and the token user's private entries", () => {
    expect(
      isLedgerEntryVisibleToMcp({
        ownerId: "partner",
        isShared: false,
        currentUserId: "me",
      }),
    ).toBe(false);
    expect(
      isLedgerEntryVisibleToMcp({
        ownerId: "me",
        isShared: false,
        currentUserId: "me",
      }),
    ).toBe(true);
    expect(
      isLedgerEntryVisibleToMcp({
        ownerId: "partner",
        isShared: true,
        currentUserId: "me",
      }),
    ).toBe(true);
  });
});
