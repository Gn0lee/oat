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
  it("exposes the v0 read-only tool set and prepared write tools", () => {
    expect(MCP_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
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

  it("exposes a Money Endpoint detail tool for balance timelines", () => {
    const detailTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === "get_money_endpoint_detail",
    );

    expect(detailTool?.inputSchema.properties).toMatchObject({
      endpointType: {
        type: "string",
        enum: ["account", "paymentMethod"],
      },
      endpointId: { type: "string" },
    });
  });

  it("exposes a ledger create tool without owner or household overrides", () => {
    const createTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === "create_ledger_entry",
    );

    const properties = createTool?.inputSchema.properties;
    expect(properties).toMatchObject({
      type: { type: "string" },
      amount: { type: "number" },
      transactedAt: { type: "string" },
      title: { type: "string" },
      isShared: { type: "boolean" },
    });
    expect(properties).not.toHaveProperty("ownerId");
    expect(properties).not.toHaveProperty("householdId");
    expect(createTool?.inputSchema.required).toEqual(
      expect.arrayContaining(["type", "amount", "transactedAt", "title"]),
    );
  });

  it("exposes a ledger update tool requiring entryId without scope overrides", () => {
    const updateTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === "update_ledger_entry",
    );

    const properties = updateTool?.inputSchema.properties;
    expect(properties).toMatchObject({
      entryId: { type: "string" },
      amount: { type: "number" },
    });
    expect(properties).not.toHaveProperty("ownerId");
    expect(properties).not.toHaveProperty("householdId");
    expect(properties).not.toHaveProperty("isShared");
    expect(updateTool?.inputSchema.required).toEqual(["entryId"]);
  });

  it("exposes a ledger delete tool requiring only entryId", () => {
    const deleteTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === "delete_ledger_entry",
    );

    const properties = deleteTool?.inputSchema.properties;
    expect(properties).toMatchObject({
      entryId: { type: "string" },
    });
    expect(deleteTool?.inputSchema.required).toEqual(["entryId"]);
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
        aggregatedOnly: [],
        excluded: [
          "partner private ledger details",
          "partner private ledger totals",
        ],
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
