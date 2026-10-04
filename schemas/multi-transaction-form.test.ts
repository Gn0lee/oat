import { describe, expect, it } from "vitest";
import {
  multiTransactionFormSchema,
  transactionItemSchema,
} from "./multi-transaction-form";

const validItem = {
  stock: {
    code: "AAPL",
    name: "Apple Inc.",
    market: "US" as const,
    exchange: "NASDAQ",
  },
  quantity: "2",
  price: "0",
  memo: "",
};

describe("transactionItemSchema", () => {
  it.each([
    [
      "KR",
      { ...validItem, stock: { ...validItem.stock, market: "KR" as const } },
    ],
    ["US", validItem],
  ])("accepts valid %s stock item including zero price", (_label, item) => {
    expect(transactionItemSchema.safeParse(item).success).toBe(true);
  });

  it.each([
    ["null stock", { ...validItem, stock: null }],
    [
      "blank stock code",
      { ...validItem, stock: { ...validItem.stock, code: "" } },
    ],
    ["blank quantity", { ...validItem, quantity: "" }],
    ["whitespace quantity", { ...validItem, quantity: "  " }],
    ["zero quantity", { ...validItem, quantity: "0" }],
    ["negative quantity", { ...validItem, quantity: "-1" }],
    ["non-finite quantity", { ...validItem, quantity: "Infinity" }],
    ["oversize quantity", { ...validItem, quantity: "1000000000" }],
    ["blank price", { ...validItem, price: " " }],
    ["negative price", { ...validItem, price: "-0.01" }],
    ["non-finite price", { ...validItem, price: "Infinity" }],
    ["oversize price", { ...validItem, price: "1000000000000" }],
    ["oversize memo", { ...validItem, memo: "x".repeat(501) }],
  ])("rejects %s", (_label, item) => {
    expect(transactionItemSchema.safeParse(item).success).toBe(false);
  });
});

describe("multiTransactionFormSchema", () => {
  it("rejects more than the batch API limit of 20 items", () => {
    const result = multiTransactionFormSchema.safeParse({
      type: "buy",
      transactedAt: "2026-10-02",
      accountId: "account-1",
      items: Array.from({ length: 21 }, () => validItem),
    });

    expect(result.success).toBe(false);
  });
});
