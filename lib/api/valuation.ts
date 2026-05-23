import type { StockPriceResult } from "@/lib/kis/types";

export interface ValuationPriceInput {
  quantity: number;
  avgPrice: number;
  totalInvested: number;
  currency: "KRW" | "USD";
}

export interface ValuationPriceResult {
  currentPrice: number | null;
  currentValue: number;
  investedAmount: number;
  isMissingPrice: boolean;
  isStalePrice: boolean;
}

export function calculateHoldingValuation(
  holding: ValuationPriceInput,
  price: StockPriceResult | undefined,
  exchangeRate: number,
): ValuationPriceResult {
  const isUSD = holding.currency === "USD";
  const investedAmount = isUSD
    ? holding.totalInvested * exchangeRate
    : holding.totalInvested;

  if (!price) {
    return {
      currentPrice: null,
      currentValue: 0,
      investedAmount,
      isMissingPrice: true,
      isStalePrice: false,
    };
  }

  const rawCurrentValue = holding.quantity * price.price;

  return {
    currentPrice: price.price,
    currentValue: isUSD ? rawCurrentValue * exchangeRate : rawCurrentValue,
    investedAmount,
    isMissingPrice: false,
    isStalePrice: price.status === "stale",
  };
}
