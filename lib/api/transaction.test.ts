import { describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import {
  assertTransactionAccountOwnership,
  type BatchTransactionItem,
  createBatchTransactions,
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

describe("createBatchTransactions", () => {
  const accountA = "account-a";
  const accountB = "account-b";

  function createBatchSupabaseMock(holdings: Record<string, number>) {
    const holdingQueries: Record<string, string>[] = [];
    const insert = vi.fn((rows: Record<string, unknown>[]) => ({
      select: vi.fn().mockResolvedValue({
        data: rows.map((row, index) => ({ id: `tx-${index}`, ...row })),
        error: null,
      }),
    }));

    function createHoldingsBuilder() {
      const filters: Record<string, string> = {};
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          filters[column] = value;
          return builder;
        }),
        single: vi.fn(async () => {
          holdingQueries.push({ ...filters });
          const quantity = holdings[`${filters.ticker}:${filters.account_id}`];
          return quantity === undefined
            ? { data: null, error: { code: "PGRST116" } }
            : { data: { quantity }, error: null };
        }),
      };
      return builder;
    }

    function createAccountsBuilder() {
      const filters: Record<string, string> = {};
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          filters[column] = value;
          return builder;
        }),
        single: vi.fn(async () => ({
          data: {
            id: filters.id,
            household_id: "household-1",
            owner_id: "user-1",
            balance: null,
          },
          error: null,
        })),
      };
      return builder;
    }

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "accounts") return createAccountsBuilder();
        if (table === "holdings") return createHoldingsBuilder();
        if (table === "household_stock_settings") {
          return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { insert };
      }),
    };

    return { supabase, insert, holdingQueries };
  }

  function item(
    overrides: Partial<BatchTransactionItem> = {},
  ): BatchTransactionItem {
    return {
      type: "buy",
      ticker: "005930",
      quantity: 1,
      price: 70000,
      transactedAt: "2026-10-02T00:00:00.000Z",
      accountId: accountA,
      stock: {
        name: "삼성전자",
        market: "KR",
        currency: "KRW",
        assetType: "equity",
      },
      ...overrides,
    };
  }

  it("매수와 매도가 섞인 거래를 행별 type·거래일·계좌로 저장한다", async () => {
    const { supabase, insert } = createBatchSupabaseMock({
      "005930:account-a": 10,
    });

    await createBatchTransactions(supabase as never, {
      householdId: "household-1",
      ownerId: "user-1",
      items: [
        item({ type: "sell", quantity: 4 }),
        item({
          type: "buy",
          ticker: "AAPL",
          price: 195.5,
          transactedAt: "2026-10-01T00:00:00.000Z",
          accountId: accountB,
          memo: "리밸런싱",
          stock: {
            name: "Apple",
            market: "US",
            currency: "USD",
            assetType: "equity",
          },
        }),
      ],
    });

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        ticker: "005930",
        type: "sell",
        quantity: 4,
        transacted_at: "2026-10-02T00:00:00.000Z",
        account_id: accountA,
        memo: null,
      }),
      expect.objectContaining({
        ticker: "AAPL",
        type: "buy",
        quantity: 1,
        transacted_at: "2026-10-01T00:00:00.000Z",
        account_id: accountB,
        memo: "리밸런싱",
      }),
    ]);
  });

  it("매도 행만 (종목, 계좌)별로 보유 수량을 조회한다", async () => {
    const { supabase, holdingQueries } = createBatchSupabaseMock({
      "005930:account-a": 5,
      "005930:account-b": 5,
    });

    await createBatchTransactions(supabase as never, {
      householdId: "household-1",
      ownerId: "user-1",
      items: [
        item({ type: "sell", quantity: 3, accountId: accountA }),
        item({ type: "sell", quantity: 5, accountId: accountB }),
        item({ type: "buy", ticker: "AAPL", quantity: 100 }),
      ],
    });

    expect(
      holdingQueries.map((query) => `${query.ticker}:${query.account_id}`),
    ).toEqual(["005930:account-a", "005930:account-b"]);
  });

  it("같은 요청의 매수 행은 보유 수량에 더하지 않는다", async () => {
    const { supabase, insert } = createBatchSupabaseMock({
      "005930:account-a": 5,
    });

    await expect(
      createBatchTransactions(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        items: [
          item({ type: "buy", quantity: 10 }),
          item({ type: "sell", quantity: 6 }),
        ],
      }),
    ).rejects.toMatchObject(
      new APIError(
        "INSUFFICIENT_QUANTITY",
        "해당 계좌의 보유 수량이 부족합니다.\n삼성전자(선택한 계좌): 해당 계좌 보유 5주, 매도 6주",
        400,
      ),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("같은 종목·계좌의 매도 행을 합산해 저장 전 보유 수량과 비교한다", async () => {
    const { supabase, insert } = createBatchSupabaseMock({
      "005930:account-a": 5,
    });

    await expect(
      createBatchTransactions(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        items: [
          item({ type: "sell", quantity: 3 }),
          item({ type: "sell", quantity: 3 }),
        ],
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_QUANTITY",
      message:
        "해당 계좌의 보유 수량이 부족합니다.\n삼성전자(선택한 계좌): 해당 계좌 보유 5주, 매도 6주",
    });
    expect(insert).not.toHaveBeenCalled();
  });
});
