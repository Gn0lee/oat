import { describe, expect, it } from "vitest";
import type { StockTradeComposerItem } from "@/schemas/stock-trade-composer";
import {
  createTradeDraft,
  getMissingTradeStep,
  getTradeStepIssues,
  selectTradeReturnHref,
  toTradePayload,
} from "./composer";

const accountId = "00000000-0000-4000-8000-000000000020";

const completeTrade: StockTradeComposerItem = {
  clientId: "trade-1",
  type: "buy",
  stock: { code: "AAPL", name: "Apple", market: "US", exchange: "NASDAQ" },
  quantity: "3",
  price: "195.5",
  transactedAt: "2026-06-05",
  accountId,
  memo: "",
};

describe("stock trade composer helpers", () => {
  it("creates a draft with no buy/sell default and the entry date and account", () => {
    expect(
      createTradeDraft({
        clientId: "x",
        date: "2026-06-05",
        accountId,
      }),
    ).toEqual({
      clientId: "x",
      type: null,
      stock: null,
      quantity: "",
      price: "",
      transactedAt: "2026-06-05",
      accountId,
      memo: "",
    });
  });

  it("reports basics issues per field, including a missing buy/sell", () => {
    const draft = createTradeDraft({ clientId: "x", date: "2026-06-05" });
    const fields = getTradeStepIssues(draft, "basics").map(
      (issue) => issue.path[0],
    );
    expect(fields).toEqual(["type", "stock", "quantity", "price"]);
    expect(getTradeStepIssues(draft, "basics")[0]?.message).toBe(
      "매수 또는 매도를 선택해 주세요.",
    );
  });

  it("rejects zero or invalid quantity and negative price", () => {
    const issues = getTradeStepIssues(
      { ...completeTrade, quantity: "0", price: "-1" },
      "basics",
    );
    expect(issues.map((issue) => issue.path[0])).toEqual(["quantity", "price"]);
  });

  it("reports details issues for date and account only", () => {
    const issues = getTradeStepIssues(
      { ...completeTrade, transactedAt: "", accountId: "" },
      "details",
    );
    expect(issues.map((issue) => issue.path[0])).toEqual([
      "transactedAt",
      "accountId",
    ]);
    expect(getTradeStepIssues(completeTrade, "details")).toEqual([]);
  });

  it("finds the first step with a missing value", () => {
    expect(getMissingTradeStep({ ...completeTrade, type: null })).toBe(
      "basics",
    );
    expect(
      getMissingTradeStep({ ...completeTrade, type: null, accountId: "" }),
    ).toBe("basics");
    expect(getMissingTradeStep({ ...completeTrade, accountId: "" })).toBe(
      "details",
    );
    expect(getMissingTradeStep(completeTrade)).toBeNull();
  });

  it("converts a US trade into a USD equity payload with its own type, date and account", () => {
    expect(toTradePayload({ ...completeTrade, memo: "  " })).toEqual({
      type: "buy",
      ticker: "AAPL",
      quantity: 3,
      price: 195.5,
      memo: undefined,
      transactedAt: "2026-06-05T00:00:00.000Z",
      accountId,
      stock: {
        name: "Apple",
        market: "US",
        currency: "USD",
        assetType: "equity",
      },
    });
  });

  it("converts a KR sell into a KRW payload and keeps the memo", () => {
    expect(
      toTradePayload({
        ...completeTrade,
        type: "sell",
        stock: {
          code: "005930",
          name: "삼성전자",
          market: "KR",
          exchange: null,
        },
        quantity: "2",
        price: "70000",
        memo: "리밸런싱",
      }),
    ).toMatchObject({
      type: "sell",
      ticker: "005930",
      memo: "리밸런싱",
      stock: { market: "KR", currency: "KRW", assetType: "equity" },
    });
  });

  it("throws when a trade is still missing values", () => {
    expect(() => toTradePayload({ ...completeTrade, type: null })).toThrow();
  });

  it("returns to the saved date's records for daily entry and to the trade list otherwise", () => {
    const payloads = [
      toTradePayload(completeTrade),
      toTradePayload({ ...completeTrade, transactedAt: "2026-06-07" }),
    ];
    expect(selectTradeReturnHref({ mode: "daily", payloads })).toBe(
      "/assets/stock/records?date=2026-06-07",
    );
    expect(selectTradeReturnHref({ mode: "full", payloads })).toBe(
      "/assets/stock/transactions",
    );
  });
});
