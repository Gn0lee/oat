import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerBook, renameLedgerBook } from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { GET, PATCH } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger-books", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/ledger-books")>()),
  deleteLedgerBook: vi.fn(),
  getLedgerBook: vi.fn(),
  renameLedgerBook: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/ledger-books/[id]", () => {
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
  });

  it("rejects malformed IDs with a validation response", async () => {
    const response = await GET(
      new Request("http://localhost/api/ledger-books/nope"),
      params("nope"),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(getLedgerBook).not.toHaveBeenCalled();
  });

  it("rejects attempts to change server-owned book properties", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/ledger-books/id", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "이름", visibility: "personal" }),
      }),
      params("11111111-1111-4111-8111-111111111111"),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(renameLedgerBook).not.toHaveBeenCalled();
  });
});
