import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createBatchLedgerEntriesWithBalanceSync } from "@/lib/api/ledger";
import { notifyBatchLedgerEntriesCreated } from "@/lib/api/ledger-notifications";
import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger", () => ({
  createBatchLedgerEntriesWithBalanceSync: vi.fn(),
}));
vi.mock("@/lib/api/ledger-notifications", () => ({
  notifyBatchLedgerEntriesCreated: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const bookId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const entry = {
  type: "expense",
  amount: 1250,
  title: "Tea",
  transactedAt: "2026-04-24T10:00:00.000Z",
  bookId,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/ledger-entries/batch", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/ledger-entries/batch atomic write", () => {
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
    vi.mocked(createBatchLedgerEntriesWithBalanceSync).mockResolvedValue({
      entries: [{ id: "saved" }],
      replayed: false,
    } as never);
  });

  it("makes one atomic RPC call with selected books and server-owned identity", async () => {
    const response = await POST(
      request({
        entries: [entry],
        requestId,
        householdId: "spoof",
        ownerId: "spoof",
      }),
    );
    expect(response.status).toBe(201);
    expect(createBatchLedgerEntriesWithBalanceSync).toHaveBeenCalledTimes(1);
    expect(createBatchLedgerEntriesWithBalanceSync).toHaveBeenCalledWith(
      expect.anything(),
      "user-id",
      "household-id",
      [expect.objectContaining({ bookId })],
      requestId,
    );
  });

  it("keeps the legacy array form and suppresses notifications for an idempotent replay", async () => {
    vi.mocked(createBatchLedgerEntriesWithBalanceSync).mockResolvedValue({
      entries: [{ id: "saved" }],
      replayed: true,
    } as never);
    const response = await POST(request({ entries: [entry] }));
    expect(response.status).toBe(200);
    expect(response).toBeDefined();
    expect(notifyBatchLedgerEntriesCreated).not.toHaveBeenCalled();
  });

  it("returns validation error for malformed JSON without writing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ledger-entries/batch", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(createBatchLedgerEntriesWithBalanceSync).not.toHaveBeenCalled();
  });

  it("logs a batch entry without a selected book", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { bookId: _book, ...legacyEntry } = entry;

    await POST(request({ entries: [{ ...legacyEntry, isShared: true }] }));

    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '"entry-create-is-shared"',
    );
    warn.mockRestore();
  });
});
