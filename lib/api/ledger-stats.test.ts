import { describe, expect, it, vi } from "vitest";
import { getLedgerStatsByCategory, getLedgerStatsDetail } from "./ledger-stats";

function createByCategorySupabaseMock() {
  const ledgerBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    data: [
      { amount: 10000, category_id: "parent-food" },
      { amount: 20000, category_id: "child-dining" },
      { amount: 5000, category_id: null },
    ],
    error: null,
  };
  const categoryBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [
        {
          id: "parent-food",
          name: "식비",
          icon: "Utensils",
          parent_id: null,
        },
        {
          id: "child-dining",
          name: "외식",
          icon: "Store",
          parent_id: "parent-food",
        },
      ],
      error: null,
    }),
  };

  return {
    from: vi
      .fn()
      .mockReturnValueOnce(ledgerBuilder)
      .mockReturnValueOnce(categoryBuilder),
    ledgerBuilder,
    categoryBuilder,
  };
}

function createLedgerDetailSupabaseMock(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi
      .fn()
      .mockResolvedValue({ data: rows, error: null, count: rows.length }),
  };

  return {
    from: vi.fn(() => builder),
    builder,
  };
}

describe("getLedgerStatsDetail", () => {
  it("uses the same KST month boundary and filters category detail rows", async () => {
    const supabase = createLedgerDetailSupabaseMock([
      {
        id: "entry-1",
        household_id: "household-1",
        owner_id: "user-1",
        type: "expense",
        amount: 12000,
        transacted_at: "2026-05-01T00:00:00.000Z",
        title: "점심",
        category_id: "cat-1",
        from_account_id: null,
        from_payment_method_id: "pm-1",
        to_account_id: null,
        to_payment_method_id: null,
        is_shared: true,
        memo: null,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
        profiles: { id: "user-1", name: "진호" },
        categories: { id: "cat-1", name: "식비", icon: "utensils" },
        from_account: null,
        to_account: null,
        from_payment_method: { id: "pm-1", name: "카드" },
        to_payment_method: null,
      },
    ]);

    const result = await getLedgerStatsDetail(
      supabase as never,
      "household-1",
      "user-1",
      {
        kind: "category",
        year: 2026,
        month: 5,
        type: "expense",
        scope: "shared",
        categoryId: "cat-1",
      },
    );

    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.categoryName).toBe("식비");
    expect(result.viewAllHref).toBe(
      "/ledger/records?year=2026&month=5&scope=shared&type=expense&categoryId=cat-1",
    );
    expect(supabase.builder.gte).toHaveBeenCalledWith(
      "transacted_at",
      "2026-04-30T15:00:00.000Z",
    );
    expect(supabase.builder.lt).toHaveBeenCalledWith(
      "transacted_at",
      "2026-05-31T15:00:00.000Z",
    );
    expect(supabase.builder.in).toHaveBeenCalledWith("category_id", ["cat-1"]);
    expect(supabase.builder.eq).toHaveBeenCalledWith("type", "expense");
    expect(supabase.builder.eq).toHaveBeenCalledWith("is_shared", true);
    expect(supabase.builder.range).toHaveBeenCalledWith(0, 19);
  });

  it("parent category detail은 parent와 child ID를 함께 필터링한다", async () => {
    const supabase = createLedgerDetailSupabaseMock([]);

    await getLedgerStatsDetail(supabase as never, "household-1", "user-1", {
      kind: "category",
      year: 2026,
      month: 5,
      type: "expense",
      scope: "shared",
      categoryId: "parent-food",
    });

    expect(supabase.builder.in).toHaveBeenCalledWith("category_id", [
      "parent-food",
    ]);
  });

  it("filters null payment-method groups explicitly", async () => {
    const supabase = createLedgerDetailSupabaseMock([]);

    await getLedgerStatsDetail(supabase as never, "household-1", "user-1", {
      kind: "payment-method",
      year: 2026,
      month: 5,
      scope: "personal",
      paymentMethodId: "__none__",
    });

    expect(supabase.builder.eq).toHaveBeenCalledWith("type", "expense");
    expect(supabase.builder.eq).toHaveBeenCalledWith("is_shared", false);
    expect(supabase.builder.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(supabase.builder.is).toHaveBeenCalledWith(
      "from_payment_method_id",
      null,
    );
  });
});

describe("getLedgerStatsByCategory", () => {
  it("child records를 parent total로 집계하고 direct/children breakdown을 포함한다", async () => {
    const supabase = createByCategorySupabaseMock();

    const result = await getLedgerStatsByCategory(
      supabase as never,
      "household-1",
      "user-1",
      2026,
      5,
      "expense",
      "all",
    );

    const food = result.items.find((item) => item.categoryId === "parent-food");
    expect(food).toMatchObject({
      categoryName: "식비",
      amount: 30000,
      entryCount: 2,
      directAmount: 10000,
      directEntryCount: 1,
    });
    expect(food?.children).toEqual([
      expect.objectContaining({
        categoryId: "child-dining",
        categoryName: "외식",
        amount: 20000,
        entryCount: 1,
      }),
    ]);
  });
});
