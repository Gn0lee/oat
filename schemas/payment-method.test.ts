import { describe, expect, it } from "vitest";
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "./payment-method";

describe("createPaymentMethodSchema", () => {
  it("유효한 최소 입력으로 파싱된다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "신한 신용카드",
      type: "credit_card",
    });
    expect(result.success).toBe(true);
  });

  it("name이 없으면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({ type: "credit_card" });
    expect(result.success).toBe(false);
  });

  it("type이 없으면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({ name: "카드" });
    expect(result.success).toBe(false);
  });

  it("유효하지 않은 type이면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "unknown_type",
    });
    expect(result.success).toBe(false);
  });

  it("lastFour가 4자리 숫자가 아니면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      lastFour: "12AB",
    });
    expect(result.success).toBe(false);
  });

  it("lastFour가 4자리 미만이면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      lastFour: "123",
    });
    expect(result.success).toBe(false);
  });

  it("lastFour가 정확히 4자리 숫자이면 성공한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      lastFour: "1234",
    });
    expect(result.success).toBe(true);
  });

  it("paymentDay가 0이면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      paymentDay: 0,
    });
    expect(result.success).toBe(false);
  });

  it("paymentDay가 32이면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      paymentDay: 32,
    });
    expect(result.success).toBe(false);
  });

  it("paymentDay가 1~31 사이이면 성공한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "credit_card",
      paymentDay: 15,
    });
    expect(result.success).toBe(true);
  });

  it("name이 50자를 초과하면 실패한다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "a".repeat(51),
      type: "credit_card",
    });
    expect(result.success).toBe(false);
  });

  it("isDefault 기본값은 false다", () => {
    const result = createPaymentMethodSchema.safeParse({
      name: "카드",
      type: "debit_card",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });
});

describe("updatePaymentMethodSchema", () => {
  it("모든 필드가 optional이라 빈 객체도 성공한다", () => {
    const result = updatePaymentMethodSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("lastFour를 null로 설정할 수 있다", () => {
    const result = updatePaymentMethodSchema.safeParse({ lastFour: null });
    expect(result.success).toBe(true);
  });

  it("paymentDay를 null로 설정할 수 있다", () => {
    const result = updatePaymentMethodSchema.safeParse({ paymentDay: null });
    expect(result.success).toBe(true);
  });

  it("linkedAccountId를 null로 설정할 수 있다", () => {
    const result = updatePaymentMethodSchema.safeParse({
      linkedAccountId: null,
    });
    expect(result.success).toBe(true);
  });

  it("lastFour가 3자리이면 실패한다", () => {
    const result = updatePaymentMethodSchema.safeParse({ lastFour: "123" });
    expect(result.success).toBe(false);
  });

  it("lastFour가 문자 포함이면 실패한다", () => {
    const result = updatePaymentMethodSchema.safeParse({ lastFour: "12AB" });
    expect(result.success).toBe(false);
  });

  it("paymentDay가 0이면 실패한다", () => {
    const result = updatePaymentMethodSchema.safeParse({ paymentDay: 0 });
    expect(result.success).toBe(false);
  });

  it("paymentDay가 32이면 실패한다", () => {
    const result = updatePaymentMethodSchema.safeParse({ paymentDay: 32 });
    expect(result.success).toBe(false);
  });
});
