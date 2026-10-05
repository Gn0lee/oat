import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  searchLedgerEntries,
  searchLedgerEntriesScoped,
} from "@/lib/api/ledger";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/api/invitation", () => ({
  getUserHouseholdId: vi.fn(),
}));

vi.mock("@/lib/api/ledger", () => ({
  searchLedgerEntries: vi.fn(),
  searchLedgerEntriesScoped: vi.fn(),
}));

vi.mock("@/lib/api/ledger-books", () => ({
  getLedgerBook: vi.fn(),
}));

const BOOK_ID = "0a6b9d64-3a4c-4f61-8d45-3fd3c40d2b0e";

function get(query: string) {
  return GET(
    new NextRequest(`http://localhost/api/ledger-entries/search?${query}`),
  );
}

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
    vi.mocked(searchLedgerEntriesScoped).mockResolvedValue({
      items: [],
      nextCursor: "next",
    });
    vi.mocked(getLedgerBook).mockResolvedValue({ id: BOOK_ID } as never);
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);
    const response = await get("q=커피");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_UNAUTHORIZED" },
    });
  });

  it("book 없이 검색하면 전체 장부 범위로 첫 페이지를 조회한다", async () => {
    const response = await get("q=%20커피%20");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { items: [], nextCursor: "next" },
    });
    expect(getLedgerBook).not.toHaveBeenCalled();
    expect(searchLedgerEntriesScoped).toHaveBeenCalledWith(
      expect.anything(),
      "household-1",
      { query: "커피", bookId: undefined, cursor: undefined, limit: 20 },
    );
    expect(searchLedgerEntries).not.toHaveBeenCalled();
  });

  it("book과 cursor를 받으면 장부 접근을 먼저 검사하고 그 범위로 이어서 조회한다", async () => {
    const response = await get(`q=커피&book=${BOOK_ID}&cursor=abc_-1`);

    expect(response.status).toBe(200);
    expect(getLedgerBook).toHaveBeenCalledWith(
      expect.anything(),
      "household-1",
      BOOK_ID,
    );
    expect(searchLedgerEntriesScoped).toHaveBeenCalledWith(
      expect.anything(),
      "household-1",
      { query: "커피", bookId: BOOK_ID, cursor: "abc_-1", limit: 20 },
    );
  });

  it("형식이 틀린 book은 400", async () => {
    const response = await get("q=커피&book=not-a-uuid");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(searchLedgerEntriesScoped).not.toHaveBeenCalled();
  });

  it("볼 수 없는 장부는 결과를 전체로 바꾸지 않고 404 BOOK_UNAVAILABLE", async () => {
    vi.mocked(getLedgerBook).mockRejectedValue(
      new APIError("BOOK_UNAVAILABLE", "장부를 사용할 수 없습니다.", 404),
    );
    const response = await get(`q=커피&book=${BOOK_ID}`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BOOK_UNAVAILABLE" },
    });
    expect(searchLedgerEntriesScoped).not.toHaveBeenCalled();
  });

  it("다른 검색의 cursor는 400 LEDGER_SEARCH_CURSOR_INVALID", async () => {
    vi.mocked(searchLedgerEntriesScoped).mockRejectedValue(
      new APIError("LEDGER_SEARCH_CURSOR_INVALID", "잘못된 위치", 400),
    );
    const response = await get("q=커피&cursor=abc");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEDGER_SEARCH_CURSOR_INVALID" },
    });
  });

  it("1자 검색어는 장부 범위에서도 거절한다", async () => {
    const response = await get(`q=a&book=${BOOK_ID}`);
    expect(response.status).toBe(400);
    expect(searchLedgerEntriesScoped).not.toHaveBeenCalled();
  });

  it("구버전 scope 값이 틀리면 400", async () => {
    const response = await get("q=커피&scope=all");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEDGER_SEARCH_SCOPE_INVALID" },
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

  it("구버전 scope 요청은 기존 공개 범위·offset 검색을 유지한다", async () => {
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

  it("logs the legacy scope+offset search", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await GET(
      new NextRequest(
        "http://localhost/api/ledger-entries/search?q=%EC%83%9D%EC%9D%BC&scope=shared",
      ),
    );

    expect(String(warn.mock.calls[0]?.[0])).toContain('"search-scope-offset"');
    warn.mockRestore();
  });
});
