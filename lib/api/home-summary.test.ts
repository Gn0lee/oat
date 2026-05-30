import { describe, expect, it } from "vitest";
import { buildHomeSummary, calcSavingsRate } from "./home-summary";

describe("calcSavingsRate", () => {
  it("수입이 0이면 저축률 0을 반환한다", () => {
    expect(calcSavingsRate(0, 0)).toBe(0);
  });

  it("수입 500만, 지출 380만이면 저축률 24%를 반환한다", () => {
    expect(calcSavingsRate(5_000_000, 3_800_000)).toBe(24);
  });

  it("지출이 수입보다 크면 음수 저축률을 반환한다", () => {
    expect(calcSavingsRate(1_000_000, 1_500_000)).toBe(-50);
  });

  it("수입과 지출이 같으면 저축률 0을 반환한다", () => {
    expect(calcSavingsRate(1_000_000, 1_000_000)).toBe(0);
  });
});

describe("buildHomeSummary", () => {
  it("현금흐름과 기록 기반 자산 요약을 합쳐서 홈 요약 데이터를 반환한다", () => {
    const cashFlow = {
      year: 2026,
      month: 4,
      shared: {
        totalIncome: 5_000_000,
        totalExpense: 3_000_000,
        balance: 2_000_000,
        savingsRate: 40,
      },
      personal: {
        totalIncome: 800_000,
        totalExpense: 300_000,
        balance: 500_000,
        savingsRate: 62.5,
      },
    };

    const assets = {
      holdingCount: 5,
      totalInvested: 110_000_000,
    };

    const result = buildHomeSummary(cashFlow, assets);

    expect(result.cashFlow).toEqual(cashFlow);
    expect(result.assets).toEqual(assets);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(4);
    expect(result.userName).toBe("사용자");
    expect(result.topCategories.items).toEqual([]);
    expect(result.ledgerActivity.hasRecentOwnLedgerActivity).toBe(false);
  });

  it("가구가 없으면 기록 기반 자산 요약 기본값을 반환한다", () => {
    const result = buildHomeSummary(null, null);

    expect(result.cashFlow.shared.totalIncome).toBe(0);
    expect(result.cashFlow.shared.totalExpense).toBe(0);
    expect(result.cashFlow.shared.balance).toBe(0);
    expect(result.cashFlow.shared.savingsRate).toBe(0);
    expect(result.cashFlow.personal.totalIncome).toBe(0);
    expect(result.cashFlow.personal.totalExpense).toBe(0);
    expect(result.assets.holdingCount).toBe(0);
    expect(result.assets.totalInvested).toBe(0);
    expect(result.topCategories.total).toBe(0);
    expect(result.ledgerActivity.lastOwnLedgerEntryCreatedAt).toBeNull();
  });

  it("사용자 이름, 상위 카테고리, 장부 활동을 포함해 홈 요약 데이터를 반환한다", () => {
    const result = buildHomeSummary(
      null,
      null,
      {
        type: "expense",
        scope: "shared",
        total: 120_000,
        items: [
          {
            categoryId: "food",
            categoryName: "식비",
            categoryIcon: "utensils",
            amount: 120_000,
            percentage: 100,
            entryCount: 3,
          },
        ],
      },
      {
        hasRecentOwnLedgerActivity: true,
        lastOwnLedgerEntryCreatedAt: "2026-05-17T00:00:00.000Z",
      },
      "지호",
    );

    expect(result.userName).toBe("지호");
    expect(result.topCategories.items).toHaveLength(1);
    expect(result.ledgerActivity.hasRecentOwnLedgerActivity).toBe(true);
  });
});
