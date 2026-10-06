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
    range: vi.fn().mockReturnThis(),
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

describe("month records beyond the PostgREST response cap", () => {
  const PAGE = 1000;
  // Minutes from the month start, so every row stays inside October 2026 (KST).
  const at = (minutes: number) =>
    new Date(Date.UTC(2026, 9, 1, 0, 0) + minutes * 60_000).toISOString();
  const row = (
    i: number,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: `e${String(i).padStart(5, "0")}`,
    household_id: "household",
    book_id: "book",
    owner_id: "owner",
    type: "expense",
    amount: 100,
    category_id: null,
    from_payment_method_id: null,
    transacted_at: at(i),
    created_at: at(i),
    updated_at: at(i),
    ...overrides,
  });
  const entryRanges = (
    calls: { table: string; method: string; args: unknown[] }[],
  ) =>
    calls
      .filter((c) => c.table === "ledger_entries" && c.method === "range")
      .map((c) => c.args);

  it("keeps requesting the next range until every row of the month is returned", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    const rows = Array.from({ length: 2500 }, (_, i) => row(i));
    const { supabase, calls } = createFakeSupabase(
      { ledger_entries: rows },
      { maxRows: PAGE },
    );

    const entries = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
    });

    expect(entries).toHaveLength(2500);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2500);
    expect(entryRanges(calls)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("keeps transacted_at → created_at newest-first order across ranges", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    // Pairs share transacted_at and differ only by created_at, shuffled on input.
    // 7 is coprime with 1,500, so (i * 7) % 1500 visits every index once.
    const rows = Array.from({ length: 1500 }, (_, i) => (i * 7) % 1500).map(
      (i) =>
        row(i, { transacted_at: at(Math.floor(i / 2)), created_at: at(i) }),
    );
    const { supabase } = createFakeSupabase(
      { ledger_entries: rows },
      { maxRows: PAGE },
    );

    const entries = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
    });

    const expected = [...rows]
      .sort((a, b) =>
        a.transacted_at === b.transacted_at
          ? (b.created_at as string).localeCompare(a.created_at as string)
          : (b.transacted_at as string).localeCompare(
              a.transacted_at as string,
            ),
      )
      .map((r) => r.id);
    expect(entries).toHaveLength(1500);
    expect(entries.map((entry) => entry.id)).toEqual(expected);
  });

  it("requests only once when the month has fewer than 1,000 rows", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    const rows = Array.from({ length: 999 }, (_, i) => row(i));
    const { supabase, calls } = createFakeSupabase(
      { ledger_entries: rows },
      { maxRows: PAGE },
    );

    const entries = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
    });

    expect(entries).toHaveLength(999);
    expect(entryRanges(calls)).toEqual([[0, 999]]);
  });

  it("applies the analysis conditions and book scope to every range request", async () => {
    const { createFakeSupabase } = await import("@/lib/testing/fake-supabase");
    // 1,200 matching rows interleaved with rows each condition must drop.
    const rows = Array.from({ length: 1200 }, (_, i) => [
      row(i * 4, { category_id: "food", from_payment_method_id: "card" }),
      row(i * 4 + 1, {
        type: "income",
        category_id: "food",
        from_payment_method_id: "card",
      }),
      row(i * 4 + 2, { category_id: "rent", from_payment_method_id: "card" }),
      row(i * 4 + 3, {
        book_id: "other",
        category_id: "food",
        from_payment_method_id: "card",
      }),
    ]).flat();
    const { supabase, calls } = createFakeSupabase(
      { ledger_entries: rows, categories: [] },
      { maxRows: PAGE },
    );

    const entries = await getLedgerEntries(supabase, "household", {
      year: 2026,
      month: 10,
      bookId: "book",
      type: "expense",
      categoryId: "food",
      categoryBreakdown: "direct",
      paymentMethodId: "card",
    });

    expect(entries).toHaveLength(1200);
    expect(
      entries.every(
        (entry) =>
          entry.type === "expense" &&
          entry.categoryId === "food" &&
          entry.fromPaymentMethodId === "card",
      ),
    ).toBe(true);
    const entryCalls = calls.filter((c) => c.table === "ledger_entries");
    const filterArgs = (method: string) =>
      entryCalls.filter((c) => c.method === method).map((c) => c.args);
    expect(entryRanges(calls)).toHaveLength(2);
    expect(filterArgs("eq").filter(([column]) => column === "book_id")).toEqual(
      [
        ["book_id", "book"],
        ["book_id", "book"],
      ],
    );
    expect(filterArgs("eq").filter(([column]) => column === "type")).toEqual([
      ["type", "expense"],
      ["type", "expense"],
    ]);
    expect(filterArgs("in")).toEqual([
      ["category_id", ["food"]],
      ["category_id", ["food"]],
    ]);
    expect(
      filterArgs("eq").filter(
        ([column]) => column === "from_payment_method_id",
      ),
    ).toEqual([
      ["from_payment_method_id", "card"],
      ["from_payment_method_id", "card"],
    ]);
  });
});
