import { describe, expect, it } from "vitest";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import {
  buildStockRecordDailySummaries,
  getTransactionsForRecordDate,
  normalizeRecordDate,
} from "./records";

function transaction(
  id: string,
  type: "buy" | "sell",
  transactedAt: string,
): TransactionWithDetails {
  return {
    id,
    ticker: "005930",
    stockName: "삼성전자",
    type,
    quantity: 1,
    price: 70_000,
    totalAmount: 70_000,
    currency: "KRW",
    transactedAt,
    memo: null,
    accountId: "account-1",
    accountName: "삼성증권",
    owner: { id: "user-1", name: "진호" },
  };
}

describe("stock records", () => {
  it("summarizes stock transactions by buy/sell count per date", () => {
    const summaries = buildStockRecordDailySummaries([
      transaction("tx-1", "buy", "2026-05-31T09:00:00.000Z"),
      transaction("tx-2", "buy", "2026-05-31T10:00:00.000Z"),
      transaction("tx-3", "sell", "2026-05-31T11:00:00.000Z"),
      transaction("tx-4", "sell", "2026-05-30T09:00:00.000Z"),
    ]);

    expect(summaries.get("2026-05-31")).toEqual({ buy: 2, sell: 1 });
    expect(summaries.get("2026-05-30")).toEqual({ buy: 0, sell: 1 });
  });

  it("returns only transactions for the selected record date", () => {
    const selected = getTransactionsForRecordDate(
      [
        transaction("tx-1", "buy", "2026-05-31T09:00:00.000Z"),
        transaction("tx-2", "sell", "2026-06-01T09:00:00.000Z"),
      ],
      "2026-05-31",
    );

    expect(selected.map((item) => item.id)).toEqual(["tx-1"]);
  });

  it("normalizes invalid record date params to today's date", () => {
    expect(normalizeRecordDate("2026-05-31", "2026-06-01")).toBe("2026-05-31");
    expect(normalizeRecordDate("not-a-date", "2026-06-01")).toBe("2026-06-01");
  });
});
