import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  createLedgerEntryWithBalanceSync,
  getLedgerEntries,
} from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger", () => ({
  getLedgerEntries: vi.fn(),
  createLedgerEntryWithBalanceSync: vi.fn(),
}));
vi.mock("@/lib/api/ledger-notifications", () => ({
  notifyLedgerEntryCreated: vi.fn(),
}));
vi.mock("@/lib/api/notifications", () => ({
  markNotificationsAsReadForLinkBestEffort: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("GET /api/ledger-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserHouseholdId).mockResolvedValue("household-id");
    vi.mocked(getLedgerEntries).mockResolvedValue([]);
    vi.mocked(createLedgerEntryWithBalanceSync).mockResolvedValue({
      id: "entry-id",
    } as never);
  });

  it("ignores the removed scope and tag filters and reads the visible books", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries?scope=personal&tagId=tag-1",
      ),
    );

    expect(response.status).toBe(200);
    const options = vi.mocked(getLedgerEntries).mock.calls[0]?.[2];
    expect(options).not.toHaveProperty("scope");
    expect(options).not.toHaveProperty("tagIds");
  });

  it("passes the analysis type and payment-method conditions to the list", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries?date=2026-10-31&type=expense&paymentMethodId=__none__",
      ),
    );

    expect(response.status).toBe(200);
    expect(getLedgerEntries).toHaveBeenCalledWith(
      expect.anything(),
      "household-id",
      expect.objectContaining({ type: "expense", paymentMethodId: "__none__" }),
    );
  });

  it("rejects an unknown entry type", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/ledger-entries?type=gift"),
    );

    expect(response.status).toBe(400);
    expect(getLedgerEntries).not.toHaveBeenCalled();
  });
});

describe("POST /api/ledger-entries selected book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserHouseholdId).mockResolvedValue("household-id");
    vi.mocked(createLedgerEntryWithBalanceSync).mockResolvedValue({
      id: "entry-id",
    } as never);
  });

  it("passes the selected book and authentic server identity to the writer", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ledger-entries", {
        method: "POST",
        body: JSON.stringify({
          type: "expense",
          amount: 1200,
          title: "Tea",
          transactedAt: "2026-04-24T10:00:00.000Z",
          bookId: "11111111-1111-4111-8111-111111111111",
          ownerId: "spoof",
          householdId: "spoof",
          isShared: false,
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(createLedgerEntryWithBalanceSync).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        householdId: "household-id",
        ownerId: "user-id",
        bookId: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });

  it("returns validation error for malformed JSON without writing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ledger-entries", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(createLedgerEntryWithBalanceSync).not.toHaveBeenCalled();
  });

  it("rejects a create without a selected book", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ledger-entries", {
        method: "POST",
        body: JSON.stringify({
          type: "expense",
          amount: 1200,
          title: "Tea",
          transactedAt: "2026-04-24T10:00:00.000Z",
          isShared: false,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "장부를 선택해주세요." },
    });
    expect(createLedgerEntryWithBalanceSync).not.toHaveBeenCalled();
  });
});
