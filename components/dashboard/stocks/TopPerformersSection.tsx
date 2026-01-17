"use client";

import { TrendingDown, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { AggregatedStockHolding, StockHoldingWithReturn } from "@/types";

interface PerformerCardProps {
  title: string;
  icon: React.ReactNode;
  items: (StockHoldingWithReturn | AggregatedStockHolding)[];
  type: "gainer" | "loser";
}

function PerformerCard({ title, icon, items, type }: PerformerCardProps) {
  const isGainer = type === "gainer";
  const colorClass = isGainer ? "text-[#F04452]" : "text-[#3182F6]";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          {isGainer ? "수익 종목이 없어요" : "손실 종목이 없어요"}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.ticker}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="size-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-none">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">{item.ticker}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-medium", colorClass)}>
                  {formatPercent(item.returnRate)}
                </p>
                <p className="text-xs text-gray-500">
                  {item.returnAmount >= 0 ? "+" : ""}
                  {formatCurrency(item.returnAmount, "KRW")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopPerformersSection() {
  const { data, isLoading } = useStockAnalysis();

  const { gainers, losers } = useMemo(() => {
    if (!data || !data.byTicker || data.byTicker.length === 0) {
      return { gainers: [], losers: [] };
    }

    // 수익률 기준 정렬
    const sorted = [...data.byTicker].sort(
      (a, b) => b.returnRate - a.returnRate,
    );

    // 수익 TOP 5 (returnRate > 0인 것만)
    const gainers = sorted.filter((h) => h.returnRate > 0).slice(0, 5);

    // 손실 TOP 5 (returnRate < 0인 것만, 절대값 큰 순)
    const losers = sorted
      .filter((h) => h.returnRate < 0)
      .reverse()
      .slice(0, 5);

    return { gainers, losers };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.byTicker || data.byTicker.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PerformerCard
        title="수익 TOP 5"
        icon={<Trophy className="size-4 text-[#FF9F00]" />}
        items={gainers}
        type="gainer"
      />
      <PerformerCard
        title="손실 TOP 5"
        icon={<TrendingDown className="size-4 text-[#3182F6]" />}
        items={losers}
        type="loser"
      />
    </div>
  );
}
