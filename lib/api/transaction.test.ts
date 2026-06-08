import { describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import {
  assertTransactionAccountOwnership,
  deleteTransaction,
  getTransactionAccountBalanceDelta,
  getTransactions,
  getTransactionWithDetailsById,
} from "./transaction";

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

describe("getTransactionWithDetailsById", () => {
  it("단일 거래에 표시용 상세 이름을 붙인다", async () => {
    const transactionRow = {
      id: "tx-1",
      ticker: "AAPL",
      type: "buy",
      quantity: 3,
      price: 195.5,
      transacted_at: "2026-06-03T03:00:00.000Z",
      memo: "장기 보유",
      account_id: "account-1",
      owner_id: "user-1",
      profiles: { id: "user-1", name: "진호" },
    };
    const transactionBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: transactionRow,
        error: null,
      }),
    };
    const settingsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ ticker: "AAPL", name: "Apple", currency: "USD" }],
      }),
    };
    const accountsBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "account-1", name: "나무증권" }] }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "transactions") return transactionBuilder;
        if (table === "accounts") return accountsBuilder;
        return settingsBuilder;
      }),
    };

    const result = await getTransactionWithDetailsById(
      supabase as never,
      "tx-1",
      "household-1",
    );

    expect(result).toMatchObject({
      id: "tx-1",
      stockName: "Apple",
      currency: "USD",
      accountName: "나무증권",
      owner: { id: "user-1", name: "진호" },
    });
    expect(transactionBuilder.eq).toHaveBeenCalledWith("id", "tx-1");
    expect(transactionBuilder.eq).toHaveBeenCalledWith(
      "household_id",
      "household-1",
    );
  });

  it("거래가 없으면 NOT_FOUND를 던진다", async () => {
    const transactionBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn(() => transactionBuilder),
    };

    await expect(
      getTransactionWithDetailsById(
        supabase as never,
        "missing",
        "household-1",
      ),
    ).rejects.toMatchObject(
      new APIError("NOT_FOUND", "거래를 찾을 수 없습니다.", 404),
    );
  });
});

describe("getTransactionAccountBalanceDelta", () => {
  it("매수 거래는 계좌 예수금을 감소시킨다", () => {
    expect(
      getTransactionAccountBalanceDelta({
        type: "buy",
        quantity: 3,
        price: 10000,
      }),
    ).toBe(-30000);
  });

  it("매도 거래는 계좌 예수금을 증가시킨다", () => {
    expect(
      getTransactionAccountBalanceDelta({
        type: "sell",
        quantity: 3,
        price: 10000,
      }),
    ).toBe(30000);
  });
});

describe("assertTransactionAccountOwnership", () => {
  function createAccountOwnershipSupabaseMock(row: unknown) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    return {
      from: vi.fn(() => builder),
      builder,
    };
  }

  it("거래 소유자의 계좌이면 허용한다", async () => {
    const supabase = createAccountOwnershipSupabaseMock({
      id: "account-1",
      household_id: "household-1",
      owner_id: "user-1",
    });

    await expect(
      assertTransactionAccountOwnership(
        supabase as never,
        "household-1",
        "user-1",
        "account-1",
      ),
    ).resolves.toBeUndefined();
  });

  it("다른 구성원의 계좌이면 거부한다", async () => {
    const supabase = createAccountOwnershipSupabaseMock({
      id: "account-1",
      household_id: "household-1",
      owner_id: "other-user",
    });

    await expect(
      assertTransactionAccountOwnership(
        supabase as never,
        "household-1",
        "user-1",
        "account-1",
      ),
    ).rejects.toMatchObject(
      new APIError(
        "TRANSACTION_ACCOUNT_FORBIDDEN",
        "본인의 계좌만 거래에 사용할 수 있습니다.",
        403,
      ),
    );
  });
});

describe("deleteTransaction", () => {
  it("삭제 성공 후 삭제 전 거래 row를 반환한다", async () => {
    const transaction = {
      id: "tx-1",
      household_id: "household-1",
      owner_id: "user-1",
      ticker: "AAPL",
      type: "buy" as const,
      quantity: 3,
      price: 195.5,
      transacted_at: "2026-06-03T03:00:00.000Z",
      memo: null,
      account_id: "account-1",
      created_at: "2026-06-03T03:10:00.000Z",
    };
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: transaction, error: null }),
    };
    const accountSelectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "account-1",
          household_id: "household-1",
          balance: 100000,
        },
        error: null,
      }),
    };
    const accountUpdateBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const deleteBuilder = {
      delete: vi.fn(),
      eq: vi.fn(),
    };
    deleteBuilder.delete.mockReturnValue(deleteBuilder);
    deleteBuilder.eq
      .mockReturnValueOnce(deleteBuilder)
      .mockReturnValueOnce(deleteBuilder)
      .mockResolvedValueOnce({ error: null });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectBuilder)
        .mockReturnValueOnce(accountSelectBuilder)
        .mockReturnValueOnce(accountUpdateBuilder)
        .mockReturnValueOnce(deleteBuilder),
    };

    const result = await deleteTransaction(
      supabase as never,
      "tx-1",
      "household-1",
      "user-1",
    );

    expect(result).toEqual(transaction);
    expect(accountUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 100586.5,
      }),
    );
    expect(deleteBuilder.delete).toHaveBeenCalled();
  });
});
