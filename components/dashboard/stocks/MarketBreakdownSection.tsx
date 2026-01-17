"use client";

import { SegmentedBar } from "@/components/ui/segmented-bar";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import type { CurrencyType, MarketType } from "@/types";

const MARKET_LABELS: Record<MarketType, string> = {
  KR: "국내",
  US: "미국",
  OTHER: "기타",
};

const MARKET_COLORS: Record<MarketType, string> = {
  KR: "#4F46E5",
  US: "#03B26C",
  OTHER: "#8B95A1",
};

const CURRENCY_LABELS: Record<CurrencyType, string> = {
  KRW: "원화 (KRW)",
  USD: "달러 (USD)",
};

const CURRENCY_COLORS: Record<CurrencyType, string> = {
  KRW: "#4F46E5",
  USD: "#03B26C",
};

export function MarketBreakdownSection() {
  const { data, isLoading } = useStockAnalysis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
              <div className="h-3 w-full bg-gray-200 rounded-full mb-4" />
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.byTicker.length === 0) {
    return null;
  }

  const marketSegments = data.byMarket.map((m) => ({
    label: MARKET_LABELS[m.market],
    value: m.totalValue,
    percentage: m.percentage,
    color: MARKET_COLORS[m.market],
  }));

  const currencySegments = data.byCurrency.map((c) => ({
    label: CURRENCY_LABELS[c.currency],
    value: c.totalValue,
    percentage: c.percentage,
    color: CURRENCY_COLORS[c.currency],
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-6">시장별 비중</h3>
        <SegmentedBar segments={marketSegments} />
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-6">통화별 비중</h3>
        <SegmentedBar segments={currencySegments} />
      </div>
    </div>
  );
}
