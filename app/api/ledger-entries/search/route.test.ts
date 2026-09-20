import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { searchLedgerEntries } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/api/invitation", () => ({
  getUserHouseholdId: vi.fn(),
}));

vi.mock("@/lib/api/ledger", () => ({
  searchLedgerEntries: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/ledger-entries/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getUserHouseholdId).mockResolvedValue("household-1");
    vi.mocked(searchLedgerEntries).mockResolvedValue({
      items: [],
      nextOffset: null,
    });
  });

  it("공백을 제외한 2자 미만 검색어를 거절한다", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/search?q=%20a%20&scope=shared",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEDGER_SEARCH_QUERY_TOO_SHORT" },
    });
    expect(searchLedgerEntries).not.toHaveBeenCalled();
  });

  it("검색어와 공개 범위, offset을 서버 검색에 전달한다", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/search?q=%20%EC%83%9D%EC%9D%BC%20&scope=personal&offset=20",
      ),
    );

    expect(response.status).toBe(200);
    expect(searchLedgerEntries).toHaveBeenCalledWith(
      expect.anything(),
      "household-1",
      { query: "생일", scope: "personal", offset: 20, limit: 20 },
    );
  });
});
