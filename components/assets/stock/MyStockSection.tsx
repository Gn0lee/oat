"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  AmountText,
  GroupedList,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

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
          value={
            <AmountText
              amount={summary.totalValue}
              align="left"
              className="text-base sm:text-xl font-bold"
            />
          }
          emphasis
        />
        <MetricBlock
          label="투자원금"
          value={
            <AmountText
              amount={summary.totalInvested}
              align="left"
              className="text-base sm:text-lg font-bold"
            />
          }
        />
        <MetricBlock
          label="평가손익"
          value={
            <AmountText
              amount={summary.totalReturn}
              align="left"
              sign={returnSign}
              tone={returnTone}
              className="text-base sm:text-xl font-bold"
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
              className="text-base sm:text-lg font-bold"
            />
          }
        />
      </MetricStrip>

      <GroupedList>
        {holdings.map((item) => {
          const currentValueFull = formatCurrency(
            item.currentValue,
            item.currency,
          );
          const returnAmountFull = formatCurrency(
            item.returnAmount,
            item.currency,
          );
          return (
            <Link
              key={`${item.ticker}-${item.account.id ?? "none"}`}
              href="/assets/stock/holdings"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 line-clamp-2 break-words whitespace-normal">
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {item.ticker} · {item.quantity.toLocaleString()}주
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="w-[7.5rem] max-w-[40vw] shrink-0 text-right space-y-0.5 min-w-0">
                  <div className="block">
                    <AmountText
                      amount={item.currentValue}
                      currency={item.currency}
                      compact
                      title={currentValueFull}
                      align="right"
                      className="text-sm font-semibold"
                    />
                  </div>
                  <div className="block">
                    <AmountText
                      amount={item.returnAmount}
                      currency={item.currency}
                      compact
                      title={returnAmountFull}
                      tone={item.returnAmount >= 0 ? "increase" : "decrease"}
                      align="right"
                      className="text-xs"
                    />
                  </div>
                </div>
                <ChevronRight className="size-5 text-gray-400 shrink-0" />
              </div>
            </Link>
          );
        })}
      </GroupedList>
    </ScreenSection>
  );
}
