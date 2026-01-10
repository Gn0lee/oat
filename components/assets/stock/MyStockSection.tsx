"use client";

import { ChevronRight, TrendingDown, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { StockHoldingWithReturn } from "@/types";

interface PerformerCardProps {
  title: string;
  icon: React.ReactNode;
  items: StockHoldingWithReturn[];
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
                <span className="size-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">{item.ticker}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-medium", colorClass)}>
                  {isGainer ? "+" : ""}
                  {item.returnRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">
                  {isGainer ? "+" : ""}
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

export function MyStockSection() {
  const { data, isLoading } = useStockAnalysis();

  const { gainers, losers } = useMemo(() => {
    if (!data || data.holdings.length === 0) {
      return { gainers: [], losers: [] };
    }

    const sorted = [...data.holdings].sort(
      (a, b) => b.returnRate - a.returnRate,
    );

    const gainers = sorted.filter((h) => h.returnRate > 0).slice(0, 3);
    const losers = sorted
      .filter((h) => h.returnRate < 0)
      .reverse()
      .slice(0, 3);

    return { gainers, losers };
  }, [data]);

  if (isLoading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">내 종목</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-10 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">내 종목</h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-500">아직 보유 종목이 없어요</p>
          <Link
            href="/assets/stock/transactions/new"
            className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            첫 거래 기록하기 →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">내 종목</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformerCard
            title="수익 TOP 3"
            icon={<Trophy className="size-4 text-[#FF9F00]" />}
            items={gainers}
            type="gainer"
          />
          <PerformerCard
            title="손실 TOP 3"
            icon={<TrendingDown className="size-4 text-[#3182F6]" />}
            items={losers}
            type="loser"
          />
        </div>
        <div className="flex justify-end">
          <Link
            href="/dashboard/stocks"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            상세 분석
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
