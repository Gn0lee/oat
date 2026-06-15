"use client";

import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  AmountText,
  EntryRow,
  GroupedList,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatPercent } from "@/lib/utils/format";

export function MyStockSection() {
  const { data, isLoading } = useStockAnalysis();

  const holdings = useMemo(() => {
    if (!data?.holdings) return [];
    return [...data.holdings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 4);
  }, [data]);

  if (isLoading) {
    return (
      <ScreenSection>
        <SectionHeader title="투자 현황" />
        <div className="animate-pulse space-y-3">
          <MetricStrip columns={{ base: 2, lg: 4 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="h-6 w-28 rounded bg-gray-200" />
              </div>
            ))}
          </MetricStrip>
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
            {[1, 2, 3].map((item) => (
              <div key={item} className="border-gray-100 border-b px-4 py-3.5">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </ScreenSection>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <ScreenSection>
        <SectionHeader title="투자 현황" />
        <div className="rounded-xl bg-white p-6 text-center ring-1 ring-gray-100">
          <p className="text-gray-500">아직 보유 종목이 없어요</p>
          <Link
            href="/assets/stock/transactions/new/full"
            className="mt-3 inline-block font-medium text-indigo-600 text-sm hover:text-indigo-700"
          >
            첫 거래 기록하기
          </Link>
        </div>
      </ScreenSection>
    );
  }

  const { summary } = data;
  const returnTone = summary.totalReturn >= 0 ? "increase" : "decrease";
  const returnSign = summary.totalReturn > 0 ? "+" : "";

  return (
    <ScreenSection>
      <SectionHeader
        title="투자 현황"
        description={`${summary.holdingCount}종목 기준`}
        action={
          <Link
            href="/assets/stock/analysis/overview"
            className="font-medium text-gray-500 text-sm hover:text-gray-700"
          >
            종합 분석
          </Link>
        }
      />

      <MetricStrip columns={{ base: 2, lg: 4 }}>
        <MetricBlock
          label="평가금액"
          value={<AmountText amount={summary.totalValue} align="left" />}
          emphasis
        />
        <MetricBlock
          label="투자원금"
          value={<AmountText amount={summary.totalInvested} align="left" />}
        />
        <MetricBlock
          label="평가손익"
          value={
            <AmountText
              amount={summary.totalReturn}
              align="left"
              sign={returnSign}
              tone={returnTone}
            />
          }
        />
        <MetricBlock
          label="수익률"
          value={
            <AmountText
              align="left"
              tone={summary.returnRate >= 0 ? "increase" : "decrease"}
              value={formatPercent(summary.returnRate)}
            />
          }
        />
      </MetricStrip>

      <GroupedList>
        {holdings.map((item) => (
          <EntryRow
            key={`${item.ticker}-${item.account.id ?? "none"}`}
            icon={BarChart3}
            title={item.name}
            description={`${item.ticker} · ${item.quantity.toLocaleString()}주`}
            href="/assets/stock/holdings"
            trailing={
              <div className="space-y-0.5">
                <AmountText amount={item.currentValue} compact />
                <AmountText
                  amount={item.returnAmount}
                  className="text-xs"
                  compact
                  sign={item.returnAmount > 0 ? "+" : ""}
                  tone={item.returnAmount >= 0 ? "increase" : "decrease"}
                />
              </div>
            }
          />
        ))}
      </GroupedList>
    </ScreenSection>
  );
}
