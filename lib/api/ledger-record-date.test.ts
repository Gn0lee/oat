import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/lib/api/error";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { resolveLedgerRecordsInitialDate } from "./ledger-record-date";

vi.mock("@/lib/api/ledger-books", () => ({ getLedgerBook: vi.fn() }));

function mockSupabase(row: { transacted_at: string } | null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  return { supabase: { from: vi.fn(() => builder) }, builder };
}

describe("resolveLedgerRecordsInitialDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("전체 범위는 기록을 조회하지 않고 오늘(이번 달)을 고른다", async () => {
    const { supabase } = mockSupabase({
      transacted_at: "2026-10-03T15:30:00Z",
    });
    await expect(
      resolveLedgerRecordsInitialDate(supabase as never, "house", {
        today: "2026-10-05",
      }),
    ).resolves.toBe("2026-10-05");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(getLedgerBook).not.toHaveBeenCalled();
  });

  it("활성 장부도 기록을 조회하지 않고 오늘(이번 달)을 고른다", async () => {
    vi.mocked(getLedgerBook).mockResolvedValue({ archivedAt: null } as never);
    const { supabase } = mockSupabase({
      transacted_at: "2026-10-01T00:00:00Z",
    });
    await expect(
      resolveLedgerRecordsInitialDate(supabase as never, "house", {
        bookId: "book-1",
        today: "2026-10-05",
      }),
    ).resolves.toBe("2026-10-05");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("보관 장부는 기간 제한 없이 마지막 기록일로 간다", async () => {
    vi.mocked(getLedgerBook).mockResolvedValue({
      archivedAt: "2026-09-01T00:00:00Z",
    } as never);
    const { supabase, builder } = mockSupabase({
      transacted_at: "2026-06-10T00:00:00Z",
    });
    await expect(
      resolveLedgerRecordsInitialDate(supabase as never, "house", {
        bookId: "book-1",
        today: "2026-10-05",
      }),
    ).resolves.toBe("2026-06-10");
    expect(builder.eq).toHaveBeenCalledWith("household_id", "house");
    expect(builder.eq).toHaveBeenCalledWith("book_id", "book-1");
    expect(builder.gte).not.toHaveBeenCalled();
    expect(builder.order).toHaveBeenCalledWith("transacted_at", {
      ascending: false,
    });
  });

  it("기록이 없는 보관 장부는 오늘을 고른다", async () => {
    vi.mocked(getLedgerBook).mockResolvedValue({
      archivedAt: "2026-09-01T00:00:00Z",
    } as never);
    const { supabase } = mockSupabase(null);
    await expect(
      resolveLedgerRecordsInitialDate(supabase as never, "house", {
        bookId: "book-1",
        today: "2026-10-05",
      }),
    ).resolves.toBe("2026-10-05");
  });

  it("볼 수 없는 장부는 오늘을 돌려주고 화면이 조회 불가 상태를 보여준다", async () => {
    vi.mocked(getLedgerBook).mockRejectedValue(
      new APIError("BOOK_UNAVAILABLE", "x", 404),
    );
    const { supabase } = mockSupabase(null);
    await expect(
      resolveLedgerRecordsInitialDate(supabase as never, "house", {
        bookId: "hidden",
        today: "2026-10-05",
      }),
    ).resolves.toBe("2026-10-05");
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
