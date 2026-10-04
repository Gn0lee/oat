import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  deleteLedgerEntryWithBalanceSync,
  updateLedgerEntryWithBalanceSync,
} from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger", () => ({
  updateLedgerEntryWithBalanceSync: vi.fn(),
  getLedgerEntryById: vi.fn(),
  deleteLedgerEntryWithBalanceSync: vi.fn(),
}));
vi.mock("@/lib/api/ledger-notifications", () => ({
  notifyLedgerEntryUpdated: vi.fn(),
  notifyLedgerEntryDeleted: vi.fn(),
}));
vi.mock("@/lib/api/notifications", () => ({
  markNotificationsAsReadForLinkBestEffort: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const bookId = "11111111-1111-4111-8111-111111111111";
const updatedAt = "2026-04-24T10:00:00.123456+00:00";

describe("PATCH /api/ledger-entries/[id] book writes", () => {
  const previousEntry = {
    id: "entry-id",
    owner_id: "user-id",
    is_shared: true,
  };
  const maybeSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle,
      })),
    } as never);
    maybeSingle.mockResolvedValue({ data: previousEntry, error: null });
    vi.mocked(getUserHouseholdId).mockResolvedValue("household-id");
    vi.mocked(updateLedgerEntryWithBalanceSync).mockResolvedValue({
      id: "entry-id",
      book_id: bookId,
    } as never);
  });

  it("passes book, version, and visibility confirmation to the transactional writer", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/ledger-entries/entry-id", {
        method: "PATCH",
        body: JSON.stringify({
          bookId,
          expectedUpdatedAt: updatedAt,
          confirmVisibilityChange: true,
        }),
      }),
      { params: Promise.resolve({ id: "entry-id" }) },
    );

    expect(response.status).toBe(200);
    expect(updateLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
      expect.anything(),
      "entry-id",
      "user-id",
      expect.objectContaining({
        bookId,
        expectedUpdatedAt: updatedAt,
        confirmVisibilityChange: true,
      }),
    );
  });

  it("rejects selected-book updates without an expected version", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/ledger-entries/entry-id", {
        method: "PATCH",
        body: JSON.stringify({ bookId }),
      }),
      { params: Promise.resolve({ id: "entry-id" }) },
    );

    expect(response.status).toBe(400);
    expect(updateLedgerEntryWithBalanceSync).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/ledger-entries/[id] version", () => {
  it("preserves the exact Postgres timestamp passed by the client", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/ledger-entries/entry-id", {
        method: "DELETE",
        body: JSON.stringify({ expectedUpdatedAt: updatedAt }),
      }),
      { params: Promise.resolve({ id: "entry-id" }) },
    );
    expect(response.status).toBe(200);
    expect(deleteLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
      expect.anything(),
      "entry-id",
      "user-id",
      updatedAt,
    );
  });
});
