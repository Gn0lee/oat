import { formatKst } from "@/lib/date";
import {
  type StockTradeComposerItem,
  stockTradeComposerItemSchema,
} from "@/schemas/stock-trade-composer";
import type { BatchTransactionItem } from "@/schemas/transaction";

export type TradeComposerStep = "basics" | "details";

export function createTradeDraft(input: {
  clientId: string;
  date: string;
  accountId?: string;
}): StockTradeComposerItem {
  return {
    clientId: input.clientId,
    type: null,
    stock: null,
    quantity: "",
    price: "",
    transactedAt: input.date,
    accountId: input.accountId ?? "",
    memo: "",
  };
}

const STEP_FIELDS: Record<TradeComposerStep, string[]> = {
  basics: ["type", "stock", "quantity", "price"],
  details: ["transactedAt", "accountId", "memo"],
};

export function getTradeStepIssues(
  item: StockTradeComposerItem,
  step: TradeComposerStep,
) {
  const result = stockTradeComposerItemSchema.safeParse(item);
  return result.success
    ? []
    : result.error.issues.filter((issue) =>
        STEP_FIELDS[step].includes(String(issue.path[0])),
      );
}

export function getMissingTradeStep(
  item: StockTradeComposerItem,
): TradeComposerStep | null {
  return getTradeStepIssues(item, "basics").length
    ? "basics"
    : getTradeStepIssues(item, "details").length
      ? "details"
      : null;
}

export function toTradePayload(
  item: StockTradeComposerItem,
): BatchTransactionItem {
  const { type, stock } = item;
  if (getMissingTradeStep(item) || !type || !stock) {
    throw new Error("입력 내용을 확인해 주세요.");
  }
  return {
    type,
    ticker: stock.code,
    quantity: Number(item.quantity),
    price: Number(item.price),
    memo: item.memo?.trim() ? item.memo : undefined,
    transactedAt: new Date(item.transactedAt).toISOString(),
    accountId: item.accountId,
    stock: {
      name: stock.name,
      market: stock.market,
      currency: stock.market === "US" ? "USD" : "KRW",
      assetType: "equity",
    },
  };
}

export function selectTradeReturnHref(input: {
  mode: "full" | "daily";
  payloads: Array<Pick<BatchTransactionItem, "transactedAt">>;
}): string {
  if (input.mode !== "daily") return "/assets/stock/transactions";
  const latestDate = input.payloads
    .map((payload) => formatKst(payload.transactedAt))
    .filter(Boolean)
    .sort()
    .at(-1);
  return `/assets/stock/records${latestDate ? `?date=${latestDate}` : ""}`;
}
