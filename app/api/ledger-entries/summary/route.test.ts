import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerEntrySummary } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger", () => ({ getLedgerEntrySummary: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("GET /api/ledger-entries/summary scope validation", () => {
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
    vi.mocked(getLedgerEntrySummary).mockResolvedValue({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    });
  });

  it("rejects an unknown scope", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/summary?scope=unknown",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(getLedgerEntrySummary).not.toHaveBeenCalled();
  });

  it("uses the all-books scope by default", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/summary?year=2026&month=10&scope=all",
      ),
    );

    expect(response.status).toBe(200);
    expect(getLedgerEntrySummary).toHaveBeenCalledWith(
      expect.anything(),
      "household-id",
      { year: 2026, month: 10 },
    );
  });

  it("passes the selected book", async () => {
    const book = "00000000-0000-4000-8000-000000000001";
    await GET(
      new NextRequest(
        `http://localhost/api/ledger-entries/summary?year=2026&month=10&book=${book}`,
      ),
    );

    expect(getLedgerEntrySummary).toHaveBeenCalledWith(
      expect.anything(),
      "household-id",
      { year: 2026, month: 10, bookId: book },
    );
  });

  it("maps a legacy shared/personal scope to book visibility and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/summary?year=2026&month=10&scope=personal",
      ),
    );

    expect(getLedgerEntrySummary).toHaveBeenCalledWith(
      expect.anything(),
      "household-id",
      { year: 2026, month: 10, visibility: "personal" },
    );
    expect(String(warn.mock.calls[0]?.[0])).toContain('"summary-scope"');
    warn.mockRestore();
  });
});
