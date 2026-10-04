import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import { getLedgerEntries, getLedgerEntrySummary } from "./ledger";
import { getLedgerBook } from "./ledger-books";

vi.mock("./ledger-books", () => ({ getLedgerBook: vi.fn() }));
const book = {
  id: "book",
  name: "여행",
  visibility: "shared" as const,
  createdBy: "owner",
  isDefault: false,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
function database(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders implement the PromiseLike protocol.
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return { from: vi.fn(() => builder), builder };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLedgerBook).mockResolvedValue(book);
});
describe("book-scoped ledger reads", () => {
  it("validates access before a tag filter can short-circuit into an empty success", async () => {
    const db = database([]);
    vi.mocked(getLedgerBook).mockRejectedValue(
      new APIError("BOOK_UNAVAILABLE", "hidden", 404),
    );
    await expect(
      getLedgerEntries(db as never, "household", {
        bookId: "hidden",
        tagIds: ["tag"],
      }),
    ).rejects.toMatchObject({ code: "BOOK_UNAVAILABLE", statusCode: 404 });
    expect(db.from).not.toHaveBeenCalled();
  });
  it("only queries the selected book with KST month boundaries", async () => {
    const db = database([]);
    expect(
      await getLedgerEntries(db as never, "household", {
        bookId: "book",
        year: 2026,
        month: 10,
      }),
    ).toEqual([]);
    expect(db.builder.eq).toHaveBeenCalledWith("book_id", "book");
    expect(db.builder.gte).toHaveBeenCalledWith(
      "transacted_at",
      "2026-09-30T15:00:00.000Z",
    );
    expect(db.builder.lt).toHaveBeenCalledWith(
      "transacted_at",
      "2026-10-31T15:00:00.000Z",
    );
  });
  it("uses the same KST day boundary for date lists", async () => {
    const db = database([]);
    await getLedgerEntries(db as never, "household", { date: "2026-10-01" });
    expect(db.builder.gte).toHaveBeenCalledWith(
      "transacted_at",
      "2026-09-30T15:00:00.000Z",
    );
    expect(db.builder.lt).toHaveBeenCalledWith(
      "transacted_at",
      "2026-10-01T15:00:00.000Z",
    );
  });
  it("whole summary includes every visible shared/personal/archived entry once, excluding transfers", async () => {
    const db = database([
      { type: "expense", amount: 100, is_shared: true, owner_id: "peer" },
      { type: "expense", amount: 200, is_shared: false, owner_id: "owner" },
      { type: "income", amount: 500, is_shared: true, owner_id: "owner" },
      { type: "transfer", amount: 999, is_shared: true, owner_id: "owner" },
      {
        type: "non_expense_withdrawal",
        amount: 999,
        is_shared: true,
        owner_id: "owner",
      },
    ]);
    expect(
      await getLedgerEntrySummary(
        db as never,
        "household",
        2026,
        10,
        "all",
        "owner",
      ),
    ).toEqual({ totalExpense: 300, totalIncome: 500, balance: 200 });
    expect(getLedgerBook).not.toHaveBeenCalled();
  });
  it("specific summary verifies access and filters before aggregating", async () => {
    const db = database([{ type: "expense", amount: 100 }]);
    expect(
      await getLedgerEntrySummary(
        db as never,
        "household",
        2026,
        10,
        "all",
        "owner",
        "book",
      ),
    ).toEqual({ totalExpense: 100, totalIncome: 0, balance: -100 });
    expect(getLedgerBook).toHaveBeenCalledWith(db, "household", "book");
    expect(db.builder.eq).toHaveBeenCalledWith("book_id", "book");
  });
  it("retains the explicit legacy shared scope for home/MCP callers", async () => {
    const db = database([
      { type: "expense", amount: 100, is_shared: true, owner_id: "peer" },
      { type: "expense", amount: 200, is_shared: false, owner_id: "owner" },
    ]);
    expect(
      await getLedgerEntrySummary(
        db as never,
        "household",
        2026,
        10,
        "shared",
        "owner",
      ),
    ).toEqual({ totalExpense: 100, totalIncome: 0, balance: -100 });
  });
});
