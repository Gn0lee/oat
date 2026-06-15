"use client";

import { TrendingDown, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AmountText,
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatPercent } from "@/lib/utils/format";
import type { AggregatedStockHolding, StockHoldingWithReturn } from "@/types";
import {
  type StockOverviewDetail,
  StockOverviewDetailDrawer,
} from "./StockOverviewDetailDrawer";

type PerformerItem = StockHoldingWithReturn | AggregatedStockHolding;

interface PerformerListProps {
  title: string;
  items: PerformerItem[];
  type: "gainer" | "loser";
  onSelect: (item: PerformerItem) => void;
}

function PerformerList({ title, items, type, onSelect }: PerformerListProps) {
  const isGainer = type === "gainer";
  const Icon = isGainer ? Trophy : TrendingDown;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon
          className={
            isGainer ? "size-4 text-[#FF9F00]" : "size-4 text-[#3182F6]"
          }
        />
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      </div>
      <GroupedList>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            {isGainer ? "수익 종목이 없어요" : "손실 종목이 없어요"}
          </div>
        ) : (
          items.map((item, index) => (
            <EntryRow
              key={item.ticker}
              title={item.name}
              description={`${index + 1}위 · ${item.ticker}`}
              onClick={() => onSelect(item)}
              trailing={
                <div className="space-y-0.5">
                  <AmountText
                    className="text-sm"
                    tone={isGainer ? "increase" : "decrease"}
                    value={formatPercent(item.returnRate)}
                  />
                  <AmountText
                    amount={item.returnAmount}
                    className="text-xs"
                    compact
                    sign={item.returnAmount > 0 ? "+" : ""}
                    tone={isGainer ? "increase" : "decrease"}
                  />
                </div>
              }
            />
          ))
        )}
      </GroupedList>
    </div>
  );
}

export function StockOverviewTopPerformersSection() {
  const { data, isLoading } = useStockAnalysis();
  const [detail, setDetail] = useState<StockOverviewDetail | null>(null);

  const { gainers, losers } = useMemo(() => {
    if (!data || !data.byTicker || data.byTicker.length === 0) {
      return { gainers: [], losers: [] };
    }

    const sorted = [...data.byTicker].sort(
      (a, b) => b.returnRate - a.returnRate,
    );

    const gainers = sorted.filter((h) => h.returnRate > 0).slice(0, 5);
    const losers = sorted
      .filter((h) => h.returnRate < 0)
      .reverse()
      .slice(0, 5);

    return { gainers, losers };
  }, [data]);

  if (isLoading) {
    return (
      <ScreenSection>
        <SectionHeader title="상위 성과 종목" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1, 2].map((item) => (
            <GroupedList key={item}>
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="px-4 py-3.5">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
                </div>
              ))}
            </GroupedList>
          ))}
        </div>
      </ScreenSection>
    );
  }

  if (!data || !data.byTicker || data.byTicker.length === 0) {
    return null;
  }

  return (
    <ScreenSection>
      <SectionHeader title="상위 성과 종목" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PerformerList
          title="수익 TOP 5"
          items={gainers}
          type="gainer"
          onSelect={(item) =>
            setDetail({
              kind: "ticker",
              ticker: item.ticker,
              title: `${item.name} 보유 항목`,
            })
          }
        />
        <PerformerList
          title="손실 TOP 5"
          items={losers}
          type="loser"
          onSelect={(item) =>
            setDetail({
              kind: "ticker",
              ticker: item.ticker,
              title: `${item.name} 보유 항목`,
            })
          }
        />
      </div>
      <StockOverviewDetailDrawer
        open={!!detail}
        detail={detail}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetail(null);
        }}
      />
    </ScreenSection>
  );
}
