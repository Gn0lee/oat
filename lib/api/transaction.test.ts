import { describe, expect, it, vi } from "vitest";
import { getTransactions } from "./transaction";

function createTransactionsSupabaseMock() {
  const transactionRows = [
    {
      id: "tx-1",
      ticker: "005930",
      type: "buy",
      quantity: 10,
      price: 70000,
      transacted_at: "2026-05-31T09:00:00.000Z",
      memo: null,
      account_id: "account-1",
      owner_id: "user-1",
      profiles: { id: "user-1", name: "진호" },
    },
  ];
  const transactionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi
      .fn()
      .mockResolvedValue({ data: transactionRows, error: null, count: 1 }),
  };
  const settingsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [{ ticker: "005930", name: "삼성전자", currency: "KRW" }],
    }),
  };
  const accountsBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi
      .fn()
      .mockResolvedValue({ data: [{ id: "account-1", name: "삼성증권" }] }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "transactions") return transactionsBuilder;
      if (table === "accounts") return accountsBuilder;
      return settingsBuilder;
    }),
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

  it("maps account name for transaction records", async () => {
    const supabase = createTransactionsSupabaseMock();

    const result = await getTransactions(supabase as never, "household-1", {
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.data[0].accountName).toBe("삼성증권");
  });
});
