import { describe, expect, it } from "vitest";
import {
  buildEndpointStats,
  buildMcpMeta,
  buildMoneyEndpoint,
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

  it("exposes ledger filters using the Money Endpoint model", () => {
    const searchTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === "search_ledger_entries",
    );

    expect(searchTool?.inputSchema.properties).toMatchObject({
      types: { type: "array" },
      categoryIds: { type: "array" },
      endpointIds: { type: "array" },
      endpointTypes: { type: "array" },
      ownerIds: { type: "array" },
      isShared: { type: "boolean" },
    });
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

  it("normalizes ledger source and destination to Money Endpoints", () => {
    const maps = {
      accounts: new Map([
        ["account-1", { name: "신한 주거래", ownerName: "이진호" }],
      ]),
      paymentMethods: new Map([
        ["pm-1", { name: "온누리", ownerName: "우니" }],
      ]),
    };

    expect(
      buildMoneyEndpoint(
        {
          type: "transfer",
          from_account_id: "account-1",
          from_payment_method_id: null,
          to_account_id: null,
          to_payment_method_id: "pm-1",
        },
        maps,
        "source",
      ),
    ).toEqual({
      endpointType: "account",
      endpointId: "account-1",
      endpointName: "신한 주거래",
      ownerName: "이진호",
    });

    expect(
      buildMoneyEndpoint(
        {
          type: "income",
          from_account_id: null,
          from_payment_method_id: null,
          to_account_id: null,
          to_payment_method_id: "pm-1",
        },
        maps,
        "destination",
      ),
    ).toEqual({
      endpointType: "paymentMethod",
      endpointId: "pm-1",
      endpointName: "온누리",
      ownerName: "우니",
    });
  });

  it("keeps endpoint flow totals split by ledger entry type", () => {
    const aggregate = new Map([
      [
        "account:account-1",
        {
          amount: 1_500,
          count: 2,
          endpoint: {
            endpointType: "account",
            endpointId: "account-1",
            endpointName: "신한 주거래",
            ownerName: "이진호",
          },
          breakdownByType: {
            expense: { amount: 1_000, entryCount: 1 },
            income: { amount: 0, entryCount: 0 },
            transfer: { amount: 500, entryCount: 1 },
          },
        },
      ],
    ]);

    expect(buildEndpointStats(aggregate as never)).toEqual({
      total: 1_500,
      items: [
        {
          endpointType: "account",
          endpointId: "account-1",
          endpointName: "신한 주거래",
          ownerName: "이진호",
          amount: 1_500,
          percentage: 100,
          entryCount: 2,
          breakdownByType: {
            expense: { amount: 1_000, entryCount: 1 },
            income: { amount: 0, entryCount: 0 },
            transfer: { amount: 500, entryCount: 1 },
          },
        },
      ],
    });
  });
});
