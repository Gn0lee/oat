"use client";

import Link from "next/link";
import {
  AmountText,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { formatPercent } from "@/lib/utils/format";

export function StockOverviewSummarySection() {
  const { data, isLoading, error } = useStockAnalysis();

  if (error) {
    return (
      <ScreenSection>
        <div className="rounded-xl bg-white p-6 text-center ring-1 ring-gray-100">
          <p className="text-gray-500">데이터를 불러오는데 실패했습니다.</p>
        </div>
      </ScreenSection>
    );
  }

  if (isLoading) {
    return (
      <ScreenSection>
        <SectionHeader title="투자 요약" />
        <MetricStrip columns={{ base: 2, lg: 4 }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="animate-pulse space-y-2">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-7 w-28 rounded bg-gray-200" />
            </div>
          ))}
        </MetricStrip>
      </ScreenSection>
    );
  }

  if (!data || data.summary.holdingCount === 0) {
    return (
      <ScreenSection>
        <div className="rounded-xl bg-white p-8 text-center ring-1 ring-gray-100">
          <p className="mb-2 text-gray-500">아직 보유 종목이 없어요</p>
          <Link
            href="/assets/stock/transactions/new/full"
            className="font-medium text-indigo-600 text-sm hover:text-indigo-700"
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
        title="투자 요약"
        description={`${summary.holdingCount}종목 기준`}
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
          emphasis
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
      {(summary.missingPriceCount > 0 || summary.stalePriceCount > 0) && (
        <div className="space-y-1 px-1 text-gray-500 text-xs">
          {summary.missingPriceCount > 0 && (
            <p>{summary.missingPriceCount}종목 현재가 없음</p>
          )}
          {summary.stalePriceCount > 0 && (
            <p>{summary.stalePriceCount}종목 이전 가격 기준</p>
          )}
        </div>
      )}
    </ScreenSection>
  );
}
