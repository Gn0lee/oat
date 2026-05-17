import { describe, expect, it } from "vitest";
import { buildAssetsSummary } from "./assets-summary";

describe("buildAssetsSummary", () => {
  it("포트폴리오 요약과 계좌 수를 합쳐서 자산 요약 데이터를 반환한다", () => {
    const portfolio = {
      holdingCount: 4,
      totalValue: 24_000_000,
      totalInvested: 20_000_000,
      returnRate: 20,
    };

    const result = buildAssetsSummary(portfolio, 3);

    expect(result.portfolio).toEqual(portfolio);
    expect(result.accountCount).toBe(3);
  });

  it("가구가 없으면 기본값으로 자산 요약 데이터를 반환한다", () => {
    const result = buildAssetsSummary(null, 0);

    expect(result.portfolio.totalValue).toBe(0);
    expect(result.portfolio.holdingCount).toBe(0);
    expect(result.accountCount).toBe(0);
  });
});
