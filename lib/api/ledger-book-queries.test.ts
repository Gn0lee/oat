import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import { getLedgerEntries } from "./ledger";
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
  it("validates access before querying entries", async () => {
    const db = database([]);
    vi.mocked(getLedgerBook).mockRejectedValue(
      new APIError("BOOK_UNAVAILABLE", "hidden", 404),
    );
    await expect(
      getLedgerEntries(db as never, "household", {
        bookId: "hidden",
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
});

describe("analysis view-all conditions on the records list", () => {
  it("keeps only the given type and payment method (null with __none__)", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    const row = (id: string, type: string, pm: string | null) => ({
      id,
      household_id: "household",
      book_id: "book",
      owner_id: "owner",
      type,
      amount: 100,
      transacted_at: "2026-10-05T03:00:00.000Z",
      created_at: "2026-10-05T03:00:00.000Z",
      updated_at: "2026-10-05T03:00:00.000Z",
      category_id: null,
      from_payment_method_id: pm,
    });
    const { supabase } = createFakeSupabase({
      ledger_entries: [
        row("cash", "expense", null),
        row("card", "expense", "card"),
        row("income", "income", null),
      ],
    });

    const none = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
      type: "expense",
      paymentMethodId: "__none__",
    });
    const card = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
      paymentMethodId: "card",
    });

    expect(none.map((entry) => entry.id)).toEqual(["cash"]);
    expect(card.map((entry) => entry.id)).toEqual(["card"]);
  });
});

describe("entry visibility", () => {
  it("derives isShared from the book's visibility, not a stored column", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    const row = (id: string, bookId: string) => ({
      id,
      household_id: "household",
      book_id: bookId,
      owner_id: "owner",
      type: "expense",
      amount: 100,
      transacted_at: "2026-10-05T03:00:00.000Z",
      created_at: "2026-10-05T03:00:00.000Z",
      updated_at: "2026-10-05T03:00:00.000Z",
      category_id: null,
    });
    const { supabase } = createFakeSupabase({
      ledger_entries: [row("shared", "living"), row("mine", "personal")],
      ledger_books: [
        { id: "living", household_id: "household", visibility: "shared" },
        { id: "personal", household_id: "household", visibility: "personal" },
      ],
    });

    const entries = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
    });

    expect(
      Object.fromEntries(entries.map((entry) => [entry.id, entry.isShared])),
    ).toEqual({ shared: true, mine: false });
  });
});
