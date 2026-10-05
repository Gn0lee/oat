import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLedgerEntrySummary } from "@/lib/api/ledger";
import { createFakeSupabase } from "@/lib/testing/fake-supabase";
import {
  getLedgerStatsByCategory,
  getLedgerStatsByMember,
  getLedgerStatsByPaymentMethod,
  getLedgerStatsDaily,
  getLedgerStatsDetail,
  getLedgerStatsSummary,
  getLedgerStatsTrend,
} from "./ledger-stats";

const HH = "hh-1";
const ME = "user-me";
const PARTNER = "user-partner";
const LIVING = "00000000-0000-4000-8000-000000000001";
const TRIP = "00000000-0000-4000-8000-000000000002";
const MINE = "00000000-0000-4000-8000-000000000003";
const EMPTY = "00000000-0000-4000-8000-000000000004";
const HIDDEN = "00000000-0000-4000-8000-000000000009";

function book(
  id: string,
  name: string,
  visibility: "shared" | "personal",
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    household_id: HH,
    name,
    visibility,
    created_by: visibility === "personal" ? ME : null,
    is_default: false,
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function entry(
  id: string,
  bookId: string,
  ownerId: string,
  type: string,
  amount: number,
  transactedAt: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    household_id: HH,
    book_id: bookId,
    owner_id: ownerId,
    type,
    amount,
    transacted_at: transactedAt,
    created_at: transactedAt,
    updated_at: transactedAt,
    title: id,
    memo: null,
    category_id: null,
    from_account_id: null,
    to_account_id: null,
    from_payment_method_id: null,
    to_payment_method_id: null,
    ...extra,
  };
}

// Rows visible to ME under RLS: every shared-book entry plus ME's personal book.
// The partner's personal book and its entries are not visible at all.
function fixture() {
  return createFakeSupabase({
    ledger_books: [
      book(LIVING, "생활비", "shared", { is_default: true }),
      book(TRIP, "여행", "shared", { archived_at: "2026-10-03T00:00:00.000Z" }),
      book(MINE, "개인 생활비", "personal"),
      book(EMPTY, "이사", "shared"),
    ],
    ledger_entries: [
      // 2026-10-01 00:30 KST is still 2026-09-30 in UTC.
      entry("e1", LIVING, ME, "expense", 10000, "2026-09-30T15:30:00.000Z", {
        category_id: "food",
        from_payment_method_id: "card",
      }),
      entry(
        "e2",
        LIVING,
        PARTNER,
        "expense",
        20000,
        "2026-10-05T03:00:00.000Z",
        {
          category_id: "dining",
          from_payment_method_id: "card",
        },
      ),
      entry("e3", TRIP, PARTNER, "expense", 5000, "2026-10-02T03:00:00.000Z", {
        category_id: "food",
      }),
      entry("e4", MINE, ME, "expense", 7000, "2026-10-05T04:00:00.000Z", {
        category_id: "food",
        from_payment_method_id: "card",
      }),
      entry("e5", LIVING, ME, "income", 100000, "2026-10-10T00:00:00.000Z"),
      entry("e6", LIVING, ME, "transfer", 50000, "2026-10-10T00:00:00.000Z"),
      entry(
        "e7",
        MINE,
        ME,
        "non_expense_withdrawal",
        3000,
        "2026-10-11T00:00:00.000Z",
      ),
      // 2026-09-30 23:00 KST belongs to September.
      entry("e8", LIVING, ME, "expense", 999, "2026-09-30T14:00:00.000Z"),
    ],
    categories: [
      { id: "food", name: "식비", icon: "utensils", parent_id: null },
      { id: "dining", name: "외식", icon: "store", parent_id: "food" },
    ],
    payment_methods: [{ id: "card", name: "카드", type: "credit_card" }],
    household_members: [
      { household_id: HH, user_id: ME, profiles: { name: "나" } },
      { household_id: HH, user_id: PARTNER, profiles: { name: "짝꿍" } },
    ],
  });
}

const OCT = { year: 2026, month: 10 };

describe("getLedgerStatsSummary", () => {
  it("counts every visible book once, including archived, and excludes non-cash-flow types", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsSummary(supabase, HH, OCT);

    expect(result.bookId).toBeNull();
    expect(result.total).toMatchObject({
      totalExpense: 42000,
      totalIncome: 100000,
      balance: 58000,
    });
    expect(result.shared.totalExpense).toBe(35000);
    expect(result.personal.totalExpense).toBe(7000);
  });

  it("limits every figure to the selected book", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsSummary(supabase, HH, {
      ...OCT,
      bookId: TRIP,
    });

    expect(result.bookId).toBe(TRIP);
    expect(result.total.totalExpense).toBe(5000);
    expect(result.shared.totalExpense).toBe(5000);
    expect(result.personal.totalExpense).toBe(0);
  });

  it("returns zeros for an empty book", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsSummary(supabase, HH, {
      ...OCT,
      bookId: EMPTY,
    });

    expect(result.total).toMatchObject({ totalExpense: 0, totalIncome: 0 });
  });

  it("rejects a book the user cannot see with BOOK_UNAVAILABLE", async () => {
    const { supabase } = fixture();

    await expect(
      getLedgerStatsSummary(supabase, HH, { ...OCT, bookId: HIDDEN }),
    ).rejects.toMatchObject({ code: "BOOK_UNAVAILABLE", statusCode: 404 });
  });

  it("derives shared/personal subsets from book visibility, not is_shared", async () => {
    const { supabase } = fixture();

    const shared = await getLedgerStatsSummary(supabase, HH, {
      ...OCT,
      visibility: "shared",
    });

    expect(shared.total.totalExpense).toBe(35000);
    expect(shared.personal.totalExpense).toBe(0);
  });

  it("matches the hub summary for the all-books and single-book scopes", async () => {
    const { supabase } = fixture();

    for (const bookId of [undefined, LIVING, MINE]) {
      const stats = await getLedgerStatsSummary(supabase, HH, {
        ...OCT,
        bookId,
      });
      const hub = await getLedgerEntrySummary(supabase, HH, {
        ...OCT,
        bookId,
      });
      expect(hub).toEqual({
        totalIncome: stats.total.totalIncome,
        totalExpense: stats.total.totalExpense,
        balance: stats.total.balance,
      });
    }
  });
});

describe("getLedgerStatsByMember", () => {
  it("shows each member's shared spending and only my personal spending", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByMember(supabase, HH, ME, OCT);

    expect(result.bookId).toBeNull();
    expect(result.bookVisibility).toBeNull();
    const me = result.members.find((m) => m.memberId === ME);
    const partner = result.members.find((m) => m.memberId === PARTNER);
    expect(me).toMatchObject({
      sharedExpense: 10000,
      sharedIncome: 100000,
      personalExpense: 7000,
      personalExpenseVisible: true,
    });
    expect(partner).toMatchObject({
      sharedExpense: 25000,
      personalExpense: null,
      personalExpenseVisible: false,
    });
  });

  it("returns only the creator's row for a personal book", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByMember(supabase, HH, ME, {
      ...OCT,
      bookId: MINE,
    });

    expect(result.bookVisibility).toBe("personal");
    expect(result.members).toEqual([
      expect.objectContaining({
        memberId: ME,
        sharedExpense: 0,
        personalExpense: 7000,
        personalExpenseVisible: true,
      }),
    ]);
  });

  it("groups a shared book's entries by author without a personal column", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByMember(supabase, HH, ME, {
      ...OCT,
      bookId: LIVING,
    });

    expect(result.bookVisibility).toBe("shared");
    expect(
      result.members.map((m) => [
        m.memberId,
        m.sharedExpense,
        m.personalExpense,
      ]),
    ).toEqual([
      [ME, 10000, null],
      [PARTNER, 20000, null],
    ]);
  });
});

describe("getLedgerStatsByCategory", () => {
  it("rolls child categories into the parent with a direct/children breakdown", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByCategory(supabase, HH, {
      ...OCT,
      type: "expense",
    });

    expect(result.bookId).toBeNull();
    expect(result.total).toBe(42000);
    const food = result.items.find((item) => item.categoryId === "food");
    expect(food).toMatchObject({
      categoryName: "식비",
      amount: 42000,
      entryCount: 4,
      directAmount: 22000,
      directEntryCount: 3,
    });
    expect(food?.children).toEqual([
      expect.objectContaining({ categoryId: "dining", amount: 20000 }),
    ]);
  });

  it("limits the shared subset to shared books for the home card", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByCategory(supabase, HH, {
      ...OCT,
      type: "expense",
      visibility: "shared",
    });

    expect(result.total).toBe(35000);
  });
});

describe("getLedgerStatsByPaymentMethod", () => {
  it("aggregates the selected book's expenses by payment method", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsByPaymentMethod(supabase, HH, {
      ...OCT,
      bookId: LIVING,
    });

    expect(result.bookId).toBe(LIVING);
    expect(result.total).toBe(30000);
    expect(result.items).toEqual([
      expect.objectContaining({
        paymentMethodId: "card",
        paymentMethodName: "카드",
        amount: 30000,
        entryCount: 2,
      }),
    ]);
  });
});

describe("getLedgerStatsDaily", () => {
  it("groups by KST calendar day", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsDaily(supabase, HH, OCT);

    expect(result.bookId).toBeNull();
    expect(result.items.map((item) => [item.date, item.totalExpense])).toEqual([
      ["2026-10-01", 10000],
      ["2026-10-02", 5000],
      ["2026-10-05", 27000],
      ["2026-10-10", 0],
    ]);
  });
});

describe("getLedgerStatsTrend", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-10-31 23:30 KST — still October in Korea, already past UTC midnight-ish.
    vi.setSystemTime(new Date("2026-10-31T14:30:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("buckets months on KST boundaries ending at the current KST month", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsTrend(supabase, HH, { months: 2 });

    expect(result.bookId).toBeNull();
    expect(
      result.items.map((item) => [
        item.month,
        item.totalExpense,
        item.totalIncome,
      ]),
    ).toEqual([
      [9, 999, 0],
      [10, 42000, 100000],
    ]);
  });

  it("limits the trend to the selected book", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsTrend(supabase, HH, {
      months: 1,
      bookId: MINE,
    });

    expect(result.items).toEqual([
      expect.objectContaining({ month: 10, totalExpense: 7000 }),
    ]);
  });
});

describe("getLedgerStatsDetail", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T00:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("lists the source entries of a category within the selected book", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsDetail(supabase, HH, {
      kind: "category",
      ...OCT,
      type: "expense",
      categoryId: "food",
      bookId: LIVING,
    });

    expect(result.items.map((item) => item.id)).toEqual(["e2", "e1"]);
    expect(result.totalCount).toBe(2);
    expect(result.viewAllHref).toBe(
      `/ledger/records?book=${LIVING}&date=2026-10-31&type=expense&categoryId=food`,
    );
  });

  it("keeps the payment-method condition in the view-all link", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsDetail(supabase, HH, {
      kind: "payment-method",
      ...OCT,
      paymentMethodId: "__none__",
    });

    expect(result.items.map((item) => item.id)).toEqual(["e3"]);
    expect(result.viewAllHref).toBe(
      "/ledger/records?date=2026-10-31&type=expense&paymentMethodId=__none__",
    );
  });

  it("lists one KST day's expenses and links to that day", async () => {
    const { supabase } = fixture();

    const result = await getLedgerStatsDetail(supabase, HH, {
      kind: "daily",
      date: "2026-10-01",
    });

    expect(result.items.map((item) => item.id)).toEqual(["e1"]);
    expect(result.viewAllHref).toBe(
      "/ledger/records?date=2026-10-01&type=expense",
    );
  });
});

describe("one visible transaction set", () => {
  it("summary, category, payment method and daily agree on expense totals per scope", async () => {
    const { supabase } = fixture();

    for (const bookId of [undefined, LIVING, TRIP, MINE, EMPTY]) {
      const scope = { ...OCT, bookId };
      const summary = await getLedgerStatsSummary(supabase, HH, scope);
      const byCategory = await getLedgerStatsByCategory(supabase, HH, {
        ...scope,
        type: "expense",
      });
      const byPayment = await getLedgerStatsByPaymentMethod(
        supabase,
        HH,
        scope,
      );
      const daily = await getLedgerStatsDaily(supabase, HH, scope);
      const dailyExpense = daily.items.reduce(
        (sum, item) => sum + item.totalExpense,
        0,
      );

      expect(byCategory.total).toBe(summary.total.totalExpense);
      expect(byPayment.total).toBe(summary.total.totalExpense);
      expect(dailyExpense).toBe(summary.total.totalExpense);
    }
  });
});
