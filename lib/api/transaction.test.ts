import { describe, expect, it, vi } from "vitest";
import { getTransactions } from "./transaction";

function createTransactionsSupabaseMock() {
  const transactionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  };
  const settingsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [] }),
  };

  return {
    from: vi.fn((table: string) =>
      table === "transactions" ? transactionsBuilder : settingsBuilder,
    ),
    transactionsBuilder,
  };
}

describe("getTransactions", () => {
  it("filters transactions by accountId", async () => {
    const supabase = createTransactionsSupabaseMock();

    await getTransactions(supabase as never, "household-1", {
      filters: { accountId: "account-1" },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(supabase.transactionsBuilder.eq).toHaveBeenCalledWith(
      "account_id",
      "account-1",
    );
  });
});
