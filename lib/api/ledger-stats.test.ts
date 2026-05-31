import { describe, expect, it, vi } from "vitest";
import { getLedgerStatsDetail } from "./ledger-stats";

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
    expect(supabase.builder.eq).toHaveBeenCalledWith("category_id", "cat-1");
    expect(supabase.builder.eq).toHaveBeenCalledWith("type", "expense");
    expect(supabase.builder.eq).toHaveBeenCalledWith("is_shared", true);
    expect(supabase.builder.range).toHaveBeenCalledWith(0, 19);
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
