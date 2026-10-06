import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/lib/api/error";
import type { Database } from "@/types";
import {
  createLedgerBook,
  getLedgerBook,
  getLedgerBookList,
  getLedgerBooks,
  makeDefaultLedgerBook,
  renameLedgerBook,
  throwLedgerBookMutationError,
} from "./ledger-books";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  household_id: "22222222-2222-4222-8222-222222222222",
  name: "여행",
  visibility: "shared",
  created_by: "33333333-3333-4333-8333-333333333333",
  archived_at: null,
  is_default: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeSupabase(overrides: Record<string, unknown> = {}) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
    insert: vi.fn().mockReturnThis(),
  };
  const rpcResult = { data: row, error: null };
  const supabase = {
    from: vi.fn(() => query),
    rpc: vi.fn().mockResolvedValue(rpcResult),
    ...overrides,
  };
  return {
    supabase:
      supabase as never as import("@supabase/supabase-js").SupabaseClient<Database>,
    query,
    rpcResult,
  };
}

describe("ledger book API helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists rows with explicit household scope and maps public fields", async () => {
    const { supabase, query } = makeSupabase();
    query.order.mockResolvedValue({ data: [row], error: null });

    await expect(getLedgerBooks(supabase, row.household_id)).resolves.toEqual([
      {
        id: row.id,
        name: row.name,
        visibility: "shared",
        createdBy: row.created_by,
        isDefault: false,
        archivedAt: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    ]);
    expect(query.eq).toHaveBeenCalledWith("household_id", row.household_id);
  });

  it("adds each book's latest visible entry input time without changing the order", async () => {
    const { supabase, query } = makeSupabase();
    const other = { ...row, id: "66666666-6666-4666-8666-666666666666" };
    query.order.mockResolvedValue({ data: [row, other], error: null });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ book_id: other.id, last_entry_at: "2026-10-06T01:00:00+00:00" }],
      error: null,
    } as never);

    const books = await getLedgerBookList(supabase, row.household_id);

    expect(supabase.rpc).toHaveBeenCalledWith("ledger_book_last_entries", {
      hh_id: row.household_id,
    });
    expect(books.map((book) => [book.id, book.lastEntryAt])).toEqual([
      [row.id, null],
      [other.id, "2026-10-06T01:00:00+00:00"],
    ]);
  });

  it("fails the list when the latest entry aggregate fails", async () => {
    const { supabase, query } = makeSupabase();
    query.order.mockResolvedValue({ data: [row], error: null });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "boom" },
    } as never);

    await expect(
      getLedgerBookList(supabase, row.household_id),
    ).rejects.toMatchObject({ code: "BOOK_QUERY_FAILED", statusCode: 500 });
  });

  it("returns identical unavailable errors for foreign, private, and missing books", async () => {
    const { supabase, query } = makeSupabase();
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    const unavailableErrors = await Promise.all(
      [
        row.id,
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
      ].map(async (id) => {
        try {
          await getLedgerBook(supabase, row.household_id, id);
        } catch (error) {
          return error;
        }
        throw new Error("Expected book to be unavailable");
      }),
    );

    expect(unavailableErrors.every((error) => error instanceof APIError)).toBe(
      true,
    );
    expect(
      unavailableErrors.map((error) => ({
        code: (error as APIError).code,
        message: (error as APIError).message,
        statusCode: (error as APIError).statusCode,
      })),
    ).toEqual([
      {
        code: "BOOK_UNAVAILABLE",
        message: "장부를 사용할 수 없습니다.",
        statusCode: 404,
      },
      {
        code: "BOOK_UNAVAILABLE",
        message: "장부를 사용할 수 없습니다.",
        statusCode: 404,
      },
      {
        code: "BOOK_UNAVAILABLE",
        message: "장부를 사용할 수 없습니다.",
        statusCode: 404,
      },
    ]);
  });

  it("creates only server-derived ownership fields and parsed book fields", async () => {
    const { supabase, query } = makeSupabase();
    await createLedgerBook(supabase, {
      householdId: row.household_id,
      userId: row.created_by,
      name: "여행",
      visibility: "shared",
    });

    expect(query.insert).toHaveBeenCalledWith({
      household_id: row.household_id,
      created_by: row.created_by,
      name: "여행",
      visibility: "shared",
      is_default: false,
    });
  });

  it("checks visibility before sending a narrow rename action to the RPC", async () => {
    const { supabase, query } = makeSupabase();
    await renameLedgerBook(supabase, row.household_id, row.id, "새 이름");

    expect(query.eq).toHaveBeenCalledWith("household_id", row.household_id);
    expect(query.eq).toHaveBeenCalledWith("id", row.id);
    expect(supabase.rpc).toHaveBeenCalledWith("mutate_ledger_book", {
      p_book_id: row.id,
      p_action: "rename",
      p_name: "새 이름",
    });
  });

  it("forbids making a visible personal book the household default", async () => {
    const { supabase, query } = makeSupabase();
    query.maybeSingle.mockResolvedValue({
      data: { ...row, visibility: "personal" },
      error: null,
    });

    await expect(
      makeDefaultLedgerBook(supabase, row.household_id, row.id),
    ).rejects.toMatchObject({ code: "BOOK_ACTION_FORBIDDEN", statusCode: 403 });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps database constraint codes to stable Korean API errors", () => {
    expect(() =>
      throwLedgerBookMutationError({
        code: "23505",
        message: "duplicate key violates ledger_books_personal_name_key",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "BOOK_NAME_CONFLICT", statusCode: 409 }),
    );
    expect(() =>
      throwLedgerBookMutationError({
        code: "P0001",
        message: "BOOK_NOT_EMPTY",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "BOOK_NOT_EMPTY", statusCode: 409 }),
    );
    expect(() =>
      throwLedgerBookMutationError({
        code: "23505",
        message: "some unrelated unique key",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "BOOK_MUTATION_FAILED",
        statusCode: 500,
      }),
    );
    expect(() =>
      throwLedgerBookMutationError({
        code: "42501",
        message: "permission denied",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "BOOK_ACTION_FORBIDDEN",
        statusCode: 403,
      }),
    );
    expect(() =>
      throwLedgerBookMutationError({
        code: "22023",
        message: "invalid parameter",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR", statusCode: 400 }),
    );
  });
});
