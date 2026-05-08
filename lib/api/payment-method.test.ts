import { describe, expect, it } from "vitest";
import { normalizePaymentMethodBalance } from "./payment-method";

describe("payment method balance payload", () => {
  it("선불/상품권/현금은 balance를 유지한다", () => {
    expect(normalizePaymentMethodBalance("prepaid", 30000)).toBe(30000);
    expect(normalizePaymentMethodBalance("gift_card", 20000)).toBe(20000);
    expect(normalizePaymentMethodBalance("cash", 10000)).toBe(10000);
  });

  it("신용카드와 체크카드는 balance를 null로 정규화한다", () => {
    expect(normalizePaymentMethodBalance("credit_card", 30000)).toBeNull();
    expect(normalizePaymentMethodBalance("debit_card", 30000)).toBeNull();
  });
});
