export type TradeType = "buy" | "sell";

/** 매수 빨강(#F04452), 매도 파랑(#3182F6) (토스 색). 매수/매도를 색으로 구분하는 곳은 이 값을 쓴다. */
export function tradeTypeTextClassName(type: TradeType) {
  return type === "buy" ? "text-[#F04452]" : "text-[#3182F6]";
}

export function tradeTypeBadgeClassName(type: TradeType) {
  return type === "buy"
    ? "border-transparent bg-[#F04452]/10 text-[#F04452]"
    : "border-transparent bg-[#3182F6]/10 text-[#3182F6]";
}
