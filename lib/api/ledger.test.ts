import { describe, expect, it } from "vitest";
import { buildLedgerEntryPayload, calculateLedgerSummary } from "./ledger";

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
});
