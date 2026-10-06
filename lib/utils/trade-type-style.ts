export type TradeType = "buy" | "sell";

/** 매수 빨강, 매도 파랑 (한국식). 매수/매도를 색으로 구분하는 곳은 이 값을 쓴다. */
export function tradeTypeTextClassName(type: TradeType) {
  return type === "buy" ? "text-red-600" : "text-blue-600";
}

export function tradeTypeBadgeClassName(type: TradeType) {
  return type === "buy"
    ? "border-transparent bg-red-50 text-red-600"
    : "border-transparent bg-blue-50 text-blue-600";
}
