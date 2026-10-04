import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { archiveLedgerBook } from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger-books", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/ledger-books")>()),
  archiveLedgerBook: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const routeParams = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("POST /api/ledger-books/[id]/archive", () => {
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
    vi.mocked(archiveLedgerBook).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "여행",
      visibility: "shared",
      createdBy: "user-id",
      isDefault: false,
      archivedAt: "2026-10-04T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-10-04T00:00:00Z",
    });
  });

  it("accepts an empty string request body", async () => {
    const request = new Request(
      "http://localhost/api/ledger-books/id/archive",
      {
        method: "POST",
        body: "",
      },
    );
    expect(request.body).not.toBeNull();

    const response = await POST(request, routeParams);
    expect(response.status).toBe(200);
    expect(archiveLedgerBook).toHaveBeenCalledOnce();
  });

  it("accepts a zero-byte readable stream", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
    const request = new Request(
      "http://localhost/api/ledger-books/id/archive",
      {
        method: "POST",
        body,
        duplex: "half",
      } as RequestInit,
    );

    const response = await POST(request, routeParams);
    expect(response.status).toBe(200);
    expect(archiveLedgerBook).toHaveBeenCalledOnce();
  });

  it("rejects a nonempty request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/ledger-books/id/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      routeParams,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(archiveLedgerBook).not.toHaveBeenCalled();
  });
});
