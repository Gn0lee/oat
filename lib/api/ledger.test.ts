import { describe, expect, it, vi } from "vitest";
import { APIError } from "./error";
import {
  assertLedgerFinancialSourceOwnership,
  buildLedgerEntryPayload,
  buildTransferLedgerEntryPayload,
  calculateLedgerSummary,
  getLedgerBalanceEffects,
  getLedgerEntryById,
  getOwnLedgerActivity,
  isTransferCapablePaymentMethod,
  updateLedgerEntryWithBalanceSync,
} from "./ledger";

describe("calculateLedgerSummary", () => {
  it("수입 합계를 정확히 계산한다", () => {
    const entries = [
      { type: "income" as const, amount: 3000000 },
      { type: "income" as const, amount: 500000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.totalIncome).toBe(3500000);
  });

  it("지출 합계를 정확히 계산한다", () => {
    const entries = [
      { type: "expense" as const, amount: 80000 },
      { type: "expense" as const, amount: 20000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.totalExpense).toBe(100000);
  });

  it("이체(transfer)는 합산에서 제외한다", () => {
    const entries = [
      { type: "income" as const, amount: 1000000 },
      { type: "transfer" as const, amount: 500000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.totalIncome).toBe(1000000);
    expect(result.totalExpense).toBe(0);
  });

  it("비지출 출금(non_expense_withdrawal)은 합산에서 제외한다", () => {
    const entries = [
      { type: "income" as const, amount: 1000000 },
      { type: "non_expense_withdrawal" as const, amount: 500000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.totalIncome).toBe(1000000);
    expect(result.totalExpense).toBe(0);
  });

  it("잔액 = 수입 - 지출", () => {
    const entries = [
      { type: "income" as const, amount: 5000000 },
      { type: "expense" as const, amount: 3000000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.balance).toBe(2000000);
  });

  it("항목이 없으면 모두 0을 반환한다", () => {
    const result = calculateLedgerSummary([]);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(0);
    expect(result.balance).toBe(0);
  });

  it("수입과 지출이 섞여 있어도 각각 정확히 계산한다", () => {
    const entries = [
      { type: "income" as const, amount: 4500000 },
      { type: "expense" as const, amount: 85000 },
      { type: "expense" as const, amount: 750000 },
      { type: "transfer" as const, amount: 100000 },
      { type: "income" as const, amount: 500000 },
    ];
    const result = calculateLedgerSummary(entries);
    expect(result.totalIncome).toBe(5000000);
    expect(result.totalExpense).toBe(835000);
    expect(result.balance).toBe(4165000);
  });
});

describe("getLedgerEntryById", () => {
  function createLedgerEntryDetailSupabaseMock({
    entry,
    error,
  }: {
    entry?: unknown;
    error?: unknown;
  }) {
    const ledgerBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: entry ?? null,
        error: error ?? null,
      }),
    };
    const profilesBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ id: "user-1", name: "진호" }] }),
    };
    const categoriesBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: "cat-1", name: "식비", icon: "Utensils" }],
      }),
    };
    const accountsBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "acc-1", name: "토스뱅크" }] }),
    };
    const paymentMethodsBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "pm-1", name: "체크카드" }] }),
    };
    const ledgerEntryTagsBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            ledger_entry_id: "entry-1",
            ledger_tags: { id: "tag-1", name: "여행" },
          },
        ],
      }),
    };

    return {
      from: vi.fn((table: string) => {
        if (table === "ledger_entries") return ledgerBuilder;
        if (table === "profiles") return profilesBuilder;
        if (table === "categories") return categoriesBuilder;
        if (table === "accounts") return accountsBuilder;
        if (table === "ledger_entry_tags") return ledgerEntryTagsBuilder;
        return paymentMethodsBuilder;
      }),
      ledgerBuilder,
      ledgerEntryTagsBuilder,
    };
  }

  it("가계부 단건 조회에 표시용 상세 이름을 붙인다", async () => {
    const supabase = createLedgerEntryDetailSupabaseMock({
      entry: {
        id: "entry-1",
        household_id: "household-1",
        owner_id: "user-1",
        type: "expense",
        amount: 12000,
        title: "점심",
        category_id: "cat-1",
        from_account_id: null,
        from_payment_method_id: "pm-1",
        to_account_id: null,
        to_payment_method_id: null,
        is_shared: true,
        memo: "메모 전체",
        transacted_at: "2026-06-08T03:00:00.000Z",
        created_at: "2026-06-08T03:10:00.000Z",
        updated_at: "2026-06-08T03:10:00.000Z",
      },
    });

    const result = await getLedgerEntryById(
      supabase as never,
      "entry-1",
      "household-1",
    );

    expect(result).toMatchObject({
      id: "entry-1",
      ownerName: "진호",
      categoryName: "식비",
      fromPaymentMethodName: "체크카드",
      memo: "메모 전체",
      tags: [{ id: "tag-1", name: "여행" }],
    });
    expect(supabase.ledgerBuilder.eq).toHaveBeenCalledWith("id", "entry-1");
    expect(supabase.ledgerBuilder.eq).toHaveBeenCalledWith(
      "household_id",
      "household-1",
    );
  });

  it("가계부 기록이 없으면 NOT_FOUND를 던진다", async () => {
    const supabase = createLedgerEntryDetailSupabaseMock({});

    await expect(
      getLedgerEntryById(supabase as never, "missing", "household-1"),
    ).rejects.toMatchObject(
      new APIError("NOT_FOUND", "가계부 기록을 찾을 수 없습니다.", 404),
    );
  });
});

const validDate = "2026-04-24T00:00:00.000Z";

describe("buildLedgerEntryPayload", () => {
  it("지출 + 결제수단 → fromPaymentMethodId 설정", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "50000",
      title: "이마트 장보기",
      categoryId: "cat-1",
      paymentMethodId: "pm-1",
      transactedAt: validDate,
    });
    expect(result.fromPaymentMethodId).toBe("pm-1");
    expect(result.fromAccountId).toBeUndefined();
    expect(result.toAccountId).toBeUndefined();
  });

  it("지출 + 계좌 → fromAccountId 설정 (계좌이체)", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "200000",
      title: "월세",
      categoryId: "cat-1",
      accountId: "acc-1",
      transactedAt: validDate,
    });
    expect(result.fromAccountId).toBe("acc-1");
    expect(result.fromPaymentMethodId).toBeUndefined();
    expect(result.toAccountId).toBeUndefined();
  });

  it("수입 + 계좌 → toAccountId 설정", () => {
    const result = buildLedgerEntryPayload("income", true, {
      amount: "3000000",
      title: "월급",
      categoryId: "cat-2",
      accountId: "acc-1",
      transactedAt: validDate,
    });
    expect(result.toAccountId).toBe("acc-1");
    expect(result.fromPaymentMethodId).toBeUndefined();
  });

  it("isShared가 payload에 그대로 반영된다", () => {
    const shared = buildLedgerEntryPayload("expense", true, {
      amount: "10000",
      title: "테스트",
      categoryId: "cat-1",
      transactedAt: validDate,
    });
    const private_ = buildLedgerEntryPayload("expense", false, {
      amount: "10000",
      title: "테스트",
      categoryId: "cat-1",
      transactedAt: validDate,
    });
    expect(shared.isShared).toBe(true);
    expect(private_.isShared).toBe(false);
  });

  it("amount string → number 변환", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "85000",
      title: "테스트",
      categoryId: "cat-1",
      transactedAt: validDate,
    });
    expect(result.amount).toBe(85000);
    expect(typeof result.amount).toBe("number");
  });

  it("memo가 없으면 undefined로 설정", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "10000",
      title: "테스트",
      categoryId: "cat-1",
      transactedAt: validDate,
      memo: "",
    });
    expect(result.memo).toBeUndefined();
  });

  it("memo가 있으면 그대로 반영된다", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "10000",
      title: "이마트 장보기",
      categoryId: "cat-1",
      transactedAt: validDate,
      memo: "이마트 장보기",
    });
    expect(result.memo).toBe("이마트 장보기");
  });

  it("tagNames가 있으면 tags로 전달된다", () => {
    const result = buildLedgerEntryPayload("expense", true, {
      amount: "10000",
      title: "이마트 장보기",
      categoryId: "cat-1",
      transactedAt: validDate,
      tagNames: ["여행", "마트"],
    });
    expect(result.tags).toEqual(["여행", "마트"]);
  });
});

describe("transfer helpers", () => {
  it("이체 가능한 결제수단만 true를 반환한다", () => {
    expect(isTransferCapablePaymentMethod("prepaid")).toBe(true);
    expect(isTransferCapablePaymentMethod("gift_card")).toBe(true);
    expect(isTransferCapablePaymentMethod("cash")).toBe(true);
    expect(isTransferCapablePaymentMethod("credit_card")).toBe(false);
    expect(isTransferCapablePaymentMethod("debit_card")).toBe(false);
  });

  it("이체 payload는 카테고리 없이 출발지/도착지를 설정한다", () => {
    const result = buildTransferLedgerEntryPayload(true, {
      amount: "30000",
      title: "카카오페이 충전",
      from: { kind: "account", id: "acc-1" },
      to: { kind: "paymentMethod", id: "pm-1" },
      transactedAt: "2026-05-08",
      memo: "충전",
    });

    expect(result.type).toBe("transfer");
    expect(result.amount).toBe(30000);
    expect(result.fromAccountId).toBe("acc-1");
    expect(result.toPaymentMethodId).toBe("pm-1");
    expect(result.categoryId).toBeUndefined();
  });

  it("이체 payload는 tagNames가 있으면 tags로 전달한다", () => {
    const result = buildTransferLedgerEntryPayload(true, {
      amount: "30000",
      title: "카카오페이 충전",
      from: { kind: "account", id: "acc-1" },
      to: { kind: "paymentMethod", id: "pm-1" },
      transactedAt: "2026-05-08",
      tagNames: ["이체태그"],
    });
    expect(result.tags).toEqual(["이체태그"]);
  });
});

describe("getLedgerBalanceEffects", () => {
  it("계좌 수입은 계좌 증가 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "income",
      amount: 3000000,
      toAccountId: "acc-1",
    });

    expect(effects).toEqual([
      { table: "accounts", id: "acc-1", delta: 3000000 },
    ]);
  });

  it("계좌 지출은 계좌 감소 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "expense",
      amount: 80000,
      fromAccountId: "acc-1",
    });

    expect(effects).toEqual([
      { table: "accounts", id: "acc-1", delta: -80000 },
    ]);
  });

  it("계좌에서 보조 결제수단으로 이체하면 계좌 감소와 결제수단 증가 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "transfer",
      amount: 50000,
      fromAccountId: "acc-1",
      toPaymentMethodId: "pm-1",
    });

    expect(effects).toEqual([
      { table: "accounts", id: "acc-1", delta: -50000 },
      { table: "payment_methods", id: "pm-1", delta: 50000 },
    ]);
  });

  it("보조 결제수단 지출은 결제수단 감소 효과를 만든다", () => {
    const effects = getLedgerBalanceEffects({
      type: "expense",
      amount: 12000,
      fromPaymentMethodId: "pm-1",
    });

    expect(effects).toEqual([
      { table: "payment_methods", id: "pm-1", delta: -12000 },
    ]);
  });

  it("비지출 출금은 출금처 감소 효과를 만든다 (계좌)", () => {
    const effects = getLedgerBalanceEffects({
      type: "non_expense_withdrawal",
      amount: 150000,
      fromAccountId: "acc-1",
    });

    expect(effects).toEqual([
      { table: "accounts", id: "acc-1", delta: -150000 },
    ]);
  });

  it("비지출 출금은 출금처 감소 효과를 만든다 (결제수단)", () => {
    const effects = getLedgerBalanceEffects({
      type: "non_expense_withdrawal",
      amount: 80000,
      fromPaymentMethodId: "pm-1",
    });

    expect(effects).toEqual([
      { table: "payment_methods", id: "pm-1", delta: -80000 },
    ]);
  });
});

describe("assertLedgerFinancialSourceOwnership", () => {
  function createFinancialSourceSupabaseMock({
    accounts = [],
    paymentMethods = [],
  }: {
    accounts?: Array<{
      id: string;
      owner_id: string;
      is_household_usable?: boolean;
    }>;
    paymentMethods?: Array<{
      id: string;
      owner_id: string;
      is_household_usable?: boolean;
    }>;
  }) {
    const createBuilder = (
      rows: Array<{
        id: string;
        owner_id: string;
        is_household_usable?: boolean;
      }>,
    ) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: rows, error: null }),
    });
    const accountsBuilder = createBuilder(accounts);
    const paymentMethodsBuilder = createBuilder(paymentMethods);

    return {
      from: vi.fn((table: string) =>
        table === "accounts" ? accountsBuilder : paymentMethodsBuilder,
      ),
      accountsBuilder,
      paymentMethodsBuilder,
    };
  }

  it("기록 소유자의 계좌와 결제수단이면 허용한다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      accounts: [{ id: "acc-1", owner_id: "user-1" }],
      paymentMethods: [{ id: "pm-1", owner_id: "user-1" }],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        accountIds: ["acc-1"],
        paymentMethodIds: ["pm-1"],
      }),
    ).resolves.toBeUndefined();
  });

  it("다른 구성원의 Financial Source이면 거부한다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      accounts: [{ id: "acc-1", owner_id: "other-user" }],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        accountIds: ["acc-1"],
        paymentMethodIds: [],
      }),
    ).rejects.toMatchObject(
      new APIError(
        "LEDGER_FINANCIAL_SOURCE_FORBIDDEN",
        "본인의 계좌 또는 결제수단만 기록에 사용할 수 있습니다.",
        403,
      ),
    );
  });

  it("공용 기록은 가구원 사용 허용 금융수단을 사용할 수 있다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      accounts: [
        {
          id: "acc-1",
          owner_id: "other-user",
          is_household_usable: true,
        },
      ],
      paymentMethods: [
        {
          id: "pm-1",
          owner_id: "other-user",
          is_household_usable: true,
        },
      ],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        isShared: true,
        accountIds: ["acc-1"],
        paymentMethodIds: ["pm-1"],
      }),
    ).resolves.toBeUndefined();
  });

  it("개인 기록은 다른 구성원의 허용 금융수단도 거부한다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      accounts: [
        {
          id: "acc-1",
          owner_id: "other-user",
          is_household_usable: true,
        },
      ],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        isShared: false,
        accountIds: ["acc-1"],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("공용 계좌는 기록 소유자가 달라도 허용한다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      accounts: [
        {
          id: "acc-1",
          owner_id: "other-user",
          is_household_usable: true,
        },
      ],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        isShared: true,
        accountIds: ["acc-1"],
      }),
    ).resolves.toBeUndefined();
    expect(supabase.accountsBuilder.in).toHaveBeenCalledWith("id", ["acc-1"]);
  });

  it("household 계좌 허용은 결제수단에는 적용하지 않는다", async () => {
    const supabase = createFinancialSourceSupabaseMock({
      paymentMethods: [{ id: "pm-1", owner_id: "other-user" }],
    });

    await expect(
      assertLedgerFinancialSourceOwnership(supabase as never, {
        householdId: "household-1",
        ownerId: "user-1",
        paymentMethodIds: ["pm-1"],
      }),
    ).rejects.toMatchObject({
      code: "LEDGER_FINANCIAL_SOURCE_FORBIDDEN",
      statusCode: 403,
    });
  });
});

describe("getOwnLedgerActivity", () => {
  function createLedgerActivitySupabaseMock(
    row: { created_at: string } | null,
  ) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    return {
      from: vi.fn(() => builder),
      builder,
    };
  }

  it("최근 7일 내 내가 생성한 가계부 기록이 있으면 활동 있음으로 반환한다", async () => {
    const supabase = createLedgerActivitySupabaseMock({
      created_at: "2026-05-10T00:00:00.000Z",
    });

    const result = await getOwnLedgerActivity(
      supabase as never,
      "household-1",
      "user-1",
      new Date("2026-05-13T00:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentOwnLedgerActivity: true,
      lastOwnLedgerEntryCreatedAt: "2026-05-10T00:00:00.000Z",
    });
    expect(supabase.from).toHaveBeenCalledWith("ledger_entries");
    expect(supabase.builder.eq).toHaveBeenCalledWith(
      "household_id",
      "household-1",
    );
    expect(supabase.builder.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(supabase.builder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(supabase.builder.limit).toHaveBeenCalledWith(1);
  });

  it("마지막 기록이 최근 7일보다 오래됐으면 마지막 시각과 함께 활동 없음으로 반환한다", async () => {
    const supabase = createLedgerActivitySupabaseMock({
      created_at: "2026-05-01T00:00:00.000Z",
    });

    const result = await getOwnLedgerActivity(
      supabase as never,
      "household-1",
      "user-1",
      new Date("2026-05-13T00:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentOwnLedgerActivity: false,
      lastOwnLedgerEntryCreatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("내 기록이 없으면 마지막 시각 없이 활동 없음으로 반환한다", async () => {
    const supabase = createLedgerActivitySupabaseMock(null);

    const result = await getOwnLedgerActivity(
      supabase as never,
      "household-1",
      "user-1",
      new Date("2026-05-13T00:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentOwnLedgerActivity: false,
      lastOwnLedgerEntryCreatedAt: null,
    });
  });
});

describe("updateLedgerEntry & updateLedgerEntryWithBalanceSync", () => {
  it("소유한 transfer 레코드에 대해 tag-only 업데이트 시 성공하며, 계좌 소유권 검증 및 balance sync가 수행되지 않는다", async () => {
    const existingEntry = {
      id: "entry-1",
      household_id: "household-1",
      owner_id: "user-1",
      type: "transfer",
      amount: 10000,
      title: "이체",
      transacted_at: "2026-06-20",
      from_account_id: "acc-1",
      to_account_id: "acc-2",
    };

    const updatedEntry = {
      ...existingEntry,
      updated_at: "2026-06-20T12:00:00.000Z",
    };

    const ledgerEntriesSingleMock = vi
      .fn()
      .mockResolvedValueOnce({ data: existingEntry, error: null }) // select in updateLedgerEntryWithBalanceSync
      .mockResolvedValueOnce({ data: existingEntry, error: null }) // select in updateLedgerEntry
      .mockResolvedValueOnce({ data: updatedEntry, error: null }); // update in updateLedgerEntry

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "ledger_entries") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: ledgerEntriesSingleMock,
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingEntry,
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          } as any;
        }
        if (table === "ledger_tags") {
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({
              data: [{ id: "tag-1", name: "태그" }],
              error: null,
            }),
          } as any;
        }
        if (table === "ledger_entry_tags") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }),
    };

    const result = await updateLedgerEntryWithBalanceSync(
      supabase as any,
      "entry-1",
      "user-1",
      { tags: ["#태그"] },
    );

    expect(result).toEqual(updatedEntry);

    // assertLedgerFinancialSourceOwnership is bypassed, so accounts / payment_methods should not be queried.
    expect(supabase.from).not.toHaveBeenCalledWith("accounts");
    expect(supabase.from).not.toHaveBeenCalledWith("payment_methods");
  });

  it("소유한 transfer 레코드에 대해 태그 이외의 정보를 변경하려 하면 실패한다", async () => {
    const existingEntry = {
      id: "entry-1",
      household_id: "household-1",
      owner_id: "user-1",
      type: "transfer",
      amount: 10000,
      title: "이체",
      transacted_at: "2026-06-20",
      from_account_id: "acc-1",
      to_account_id: "acc-2",
    };

    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: existingEntry, error: null }),
      update: vi.fn().mockReturnThis(),
    };

    const supabase = {
      from: vi.fn(() => builder),
    };

    await expect(
      updateLedgerEntryWithBalanceSync(supabase as any, "entry-1", "user-1", {
        amount: 20000,
        tags: ["#태그"],
      }),
    ).rejects.toThrowError("이체 기록은 태그 외의 정보를 수정할 수 없습니다.");
  });
});
