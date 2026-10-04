import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createLedgerBook, getLedgerBooks } from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger-books", () => ({
  createLedgerBook: vi.fn(),
  getLedgerBooks: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("/api/ledger-books", () => {
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
    vi.mocked(getLedgerBooks).mockResolvedValue([]);
  });

  it("requires an authenticated user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_UNAUTHORIZED" },
    });
  });

  it("rejects extra create fields before writing", async () => {
    const response = await POST(
      new Request("http://localhost/api/ledger-books", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "여행",
          visibility: "shared",
          createdBy: "attacker",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(createLedgerBook).not.toHaveBeenCalled();
  });

  it("uses the server-resolved household and authenticated user on create", async () => {
    vi.mocked(createLedgerBook).mockResolvedValue({
      id: "book-id",
      name: "여행",
      visibility: "personal",
      createdBy: "user-id",
      isDefault: false,
      archivedAt: null,
      createdAt: "now",
      updatedAt: "now",
    });
    const response = await POST(
      new Request("http://localhost/api/ledger-books", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: " 여행 ", visibility: "personal" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createLedgerBook).toHaveBeenCalledWith(expect.anything(), {
      householdId: "household-id",
      userId: "user-id",
      name: "여행",
      visibility: "personal",
    });
  });
});
