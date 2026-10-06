import { describe, expect, it } from "vitest";
import {
  tradeTypeBadgeClassName,
  tradeTypeTextClassName,
} from "./trade-type-style";

describe("tradeTypeTextClassName", () => {
  it("매수는 빨강, 매도는 파랑이다", () => {
    expect(tradeTypeTextClassName("buy")).toBe("text-red-600");
    expect(tradeTypeTextClassName("sell")).toBe("text-blue-600");
  });

  it("배지도 매수는 빨강, 매도는 파랑 계열이다", () => {
    expect(tradeTypeBadgeClassName("buy")).toContain("text-red-600");
    expect(tradeTypeBadgeClassName("sell")).toContain("text-blue-600");
  });
});
