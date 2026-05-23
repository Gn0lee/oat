import { describe, expect, it } from "vitest";
import { calculateHoldingValuation } from "./valuation";

describe("calculateHoldingValuation", () => {
  it("uses fresh market price for valuation", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      {
        market: "KR",
        code: "005930",
        price: 1000,
        changeRate: null,
        fetchedAt: new Date(),
        status: "fresh",
      },
      1300,
    );

    expect(result.currentValue).toBe(2000);
    expect(result.isMissingPrice).toBe(false);
    expect(result.isStalePrice).toBe(false);
  });

  it("includes stale price but marks it stale", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      {
        market: "KR",
        code: "005930",
        price: 1000,
        changeRate: null,
        fetchedAt: new Date(),
        status: "stale",
      },
      1300,
    );

    expect(result.currentValue).toBe(2000);
    expect(result.isMissingPrice).toBe(false);
    expect(result.isStalePrice).toBe(true);
  });

  it("does not use average purchase price for missing market valuation", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      undefined,
      1300,
    );

    expect(result.currentPrice).toBeNull();
    expect(result.currentValue).toBe(0);
    expect(result.isMissingPrice).toBe(true);
  });
});
