"use client";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatCurrency } from "@/lib/utils/format";
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
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="h-6 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return null;
  }

  const marketItems = data.byMarket.map((m) => ({
    label: MARKET_LABELS[m.market],
    value: m.totalValue,
    percentage: m.percentage,
    color: MARKET_COLORS[m.market],
  }));

  const currencyItems = data.byCurrency.map((c) => ({
    label: CURRENCY_LABELS[c.currency],
    value: c.totalValue,
    percentage: c.percentage,
    color: CURRENCY_COLORS[c.currency],
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SummaryCard
        title="시장별 비중"
        items={marketItems}
        valueFormatter={(v) => formatCurrency(v, "KRW")}
      />
      <SummaryCard
        title="통화별 비중"
        items={currencyItems}
        valueFormatter={(v) => formatCurrency(v, "KRW")}
      />
    </div>
  );
}
