import { describe, expect, it } from "vitest";
import {
  getBalanceAdjustmentDelta,
  isBalanceAdjustablePaymentMethodType,
} from "./balance-adjustment";

describe("balance adjustment domain helpers", () => {
  it("현재 잔액과 실제 잔액의 차이를 delta로 계산한다", () => {
    expect(getBalanceAdjustmentDelta(10_000, 12_500)).toBe(2_500);
    expect(getBalanceAdjustmentDelta(10_000, 7_000)).toBe(-3_000);
  });

  it("선불/상품권/현금만 결제수단 잔액 조정 대상이다", () => {
    expect(isBalanceAdjustablePaymentMethodType("prepaid")).toBe(true);
    expect(isBalanceAdjustablePaymentMethodType("gift_card")).toBe(true);
    expect(isBalanceAdjustablePaymentMethodType("cash")).toBe(true);
    expect(isBalanceAdjustablePaymentMethodType("credit_card")).toBe(false);
    expect(isBalanceAdjustablePaymentMethodType("debit_card")).toBe(false);
  });
});
