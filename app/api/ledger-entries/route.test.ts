import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerEntries } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger", () => ({ getLedgerEntries: vi.fn() }));
vi.mock("@/lib/api/ledger-notifications", () => ({
  notifyLedgerEntryCreated: vi.fn(),
}));
vi.mock("@/lib/api/notifications", () => ({
  markNotificationsAsReadForLinkBestEffort: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("GET /api/ledger-entries scope validation", () => {
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
  });

  it("rejects an unknown scope, including when a book is selected", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries?scope=unknown&book=11111111-1111-4111-8111-111111111111",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(getLedgerEntries).not.toHaveBeenCalled();
  });

  it("accepts all scope and lets the selected book define the read set", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/ledger-entries?scope=all"),
    );

    expect(response.status).toBe(200);
    expect(getLedgerEntries).toHaveBeenCalledWith(
      expect.anything(),
      "household-id",
      expect.objectContaining({ scope: undefined }),
    );
  });
});
