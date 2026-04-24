import { describe, expect, it } from "vitest";
import { calculateLedgerSummary } from "./ledger";

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
