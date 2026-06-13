import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/lib/api/error";
import {
  createLedgerEntryWithBalanceSync,
  deleteLedgerEntryWithBalanceSync,
  updateLedgerEntryWithBalanceSync,
} from "@/lib/api/ledger";
import {
  notifyLedgerEntryCreated,
  notifyLedgerEntryDeleted,
  notifyLedgerEntryUpdated,
} from "@/lib/api/ledger-notifications";
import { executeMcpTool } from "./tools";

vi.mock("@/lib/api/ledger", () => ({
  createLedgerEntryWithBalanceSync: vi.fn(),
  updateLedgerEntryWithBalanceSync: vi.fn(),
  deleteLedgerEntryWithBalanceSync: vi.fn(),
}));

vi.mock("@/lib/api/ledger-notifications", () => ({
  notifyLedgerEntryCreated: vi.fn(),
  notifyLedgerEntryUpdated: vi.fn(),
  notifyLedgerEntryDeleted: vi.fn(),
}));

const auth = {
  tokenId: "test-token",
  userId: "user-1",
  householdId: "household-1",
  scopes: ["read:ledger"],
  authMethod: "personal_token" as const,
};

describe("MCP ledger write tools", () => {
  let supabaseMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "entry-1", amount: 100 } }),
    };
  });

  describe("create_ledger_entry", () => {
    it("calls helpers with auth user/household and parses fields", async () => {
      vi.mocked(createLedgerEntryWithBalanceSync).mockResolvedValue({
        id: "new-entry",
      } as any);

      const result = await executeMcpTool(
        supabaseMock,
        auth,
        "create_ledger_entry",
        {
          type: "expense",
          amount: 1000,
          transactedAt: "2026-06-13T10:00:00.000Z",
          title: "Test",
          isShared: true,
          ownerId: "hacker", // Should be ignored
          householdId: "other-household", // Should be ignored
        },
      );

      expect(createLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
        supabaseMock,
        expect.objectContaining({
          type: "expense",
          amount: 1000,
          transactedAt: "2026-06-13T10:00:00.000Z",
          title: "Test",
          isShared: true,
          ownerId: "user-1",
          householdId: "household-1",
        }),
      );

      expect(notifyLedgerEntryCreated).toHaveBeenCalledWith(
        supabaseMock,
        expect.objectContaining({
          actorId: "user-1",
          householdId: "household-1",
          entry: { id: "new-entry" },
        }),
      );

      expect(result.data).toEqual({ id: "new-entry" });
    });

    it("throws APIError on validation failure", async () => {
      await expect(
        executeMcpTool(supabaseMock, auth, "create_ledger_entry", {
          // Missing required fields
        }),
      ).rejects.toThrow(APIError);
    });
  });

  describe("update_ledger_entry", () => {
    it("requires entryId and fetches previous row", async () => {
      vi.mocked(updateLedgerEntryWithBalanceSync).mockResolvedValue({
        id: "entry-1",
        amount: 200,
      } as any);

      const result = await executeMcpTool(
        supabaseMock,
        auth,
        "update_ledger_entry",
        {
          entryId: "entry-1",
          amount: 200,
        },
      );

      expect(supabaseMock.from).toHaveBeenCalledWith("ledger_entries");
      expect(supabaseMock.eq).toHaveBeenCalledWith("id", "entry-1");

      expect(updateLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
        supabaseMock,
        "entry-1",
        "user-1",
        { amount: 200 },
      );

      expect(notifyLedgerEntryUpdated).toHaveBeenCalledWith(
        supabaseMock,
        expect.objectContaining({
          previousEntry: { id: "entry-1", amount: 100 },
          updatedEntry: { id: "entry-1", amount: 200 },
        }),
      );

      expect(result.data).toEqual({ id: "entry-1", amount: 200 });
    });

    it("throws APIError if entryId is missing", async () => {
      await expect(
        executeMcpTool(supabaseMock, auth, "update_ledger_entry", {
          amount: 200,
        }),
      ).rejects.toThrow(APIError);
    });
  });

  describe("delete_ledger_entry", () => {
    it("requires entryId, fetches previous row, and calls helpers", async () => {
      const result = await executeMcpTool(
        supabaseMock,
        auth,
        "delete_ledger_entry",
        {
          entryId: "entry-1",
        },
      );

      expect(supabaseMock.from).toHaveBeenCalledWith("ledger_entries");
      expect(supabaseMock.eq).toHaveBeenCalledWith("id", "entry-1");

      expect(deleteLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
        supabaseMock,
        "entry-1",
        "user-1",
      );

      expect(notifyLedgerEntryDeleted).toHaveBeenCalledWith(
        supabaseMock,
        expect.objectContaining({
          entry: { id: "entry-1", amount: 100 },
        }),
      );

      expect(result.data).toEqual({ success: true, entryId: "entry-1" });
    });

    it("throws APIError if entryId is missing", async () => {
      await expect(
        executeMcpTool(supabaseMock, auth, "delete_ledger_entry", {}),
      ).rejects.toThrow(APIError);
    });
  });

  it("propagates LEDGER_FORBIDDEN for non-owner mutation attempts", async () => {
    vi.mocked(updateLedgerEntryWithBalanceSync).mockRejectedValue(
      new APIError("LEDGER_FORBIDDEN", "Forbidden", 403),
    );

    await expect(
      executeMcpTool(supabaseMock, auth, "update_ledger_entry", {
        entryId: "entry-1",
      }),
    ).rejects.toThrow(APIError);
  });
});
