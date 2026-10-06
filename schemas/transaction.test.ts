import { describe, expect, it } from "vitest";
import { createBatchTransactionSchema } from "./transaction";

const accountId = "00000000-0000-4000-8000-000000000020";

const buyItem = {
  type: "buy" as const,
  ticker: "AAPL",
  quantity: 3,
  price: 195.5,
  transactedAt: "2026-06-03T03:00:00.000Z",
  accountId,
  stock: {
    name: "Apple",
    market: "US" as const,
    currency: "USD" as const,
    assetType: "equity" as const,
  },
};

const sellItem = {
  ...buyItem,
  type: "sell" as const,
  ticker: "005930",
  stock: {
    name: "삼성전자",
    market: "KR" as const,
    currency: "KRW" as const,
    assetType: "equity" as const,
  },
};

describe("createBatchTransactionSchema", () => {
  it("매수와 매도가 섞인 거래를 받는다", () => {
    const result = createBatchTransactionSchema.safeParse({
      items: [buyItem, sellItem],
    });

    expect(result.success).toBe(true);
    expect(result.data?.items.map((item) => item.type)).toEqual([
      "buy",
      "sell",
    ]);
  });

  it.each(["type", "transactedAt", "accountId"] as const)(
    "거래마다 %s가 없으면 거부한다",
    (field) => {
      const { [field]: _omitted, ...item } = buyItem;

      expect(
        createBatchTransactionSchema.safeParse({ items: [item] }).success,
      ).toBe(false);
    },
  );

  it("buy·sell이 아닌 type을 거부한다", () => {
    const result = createBatchTransactionSchema.safeParse({
      items: [{ ...buyItem, type: "dividend" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "거래 유형은 buy 또는 sell이어야 합니다.",
    );
  });

  it("묶음 단위 type·transactedAt·accountId는 행에 적용하지 않고 버린다", () => {
    const result = createBatchTransactionSchema.safeParse({
      type: "sell",
      transactedAt: "2026-01-01T00:00:00.000Z",
      accountId,
      items: [buyItem],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [buyItem] });
  });

  it("거래가 없거나 20건을 넘으면 거부한다", () => {
    expect(createBatchTransactionSchema.safeParse({ items: [] }).success).toBe(
      false,
    );
    expect(
      createBatchTransactionSchema.safeParse({
        items: Array.from({ length: 21 }, () => buyItem),
      }).success,
    ).toBe(false);
  });
});
