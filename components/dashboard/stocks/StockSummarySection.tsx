"use client";

import {
  AlertTriangle,
  BarChart3,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

const POSITIVE_MESSAGES = [
  (rate: number) => `잘하고 있어요! ${rate.toFixed(2)}% 수익 중`,
  (rate: number) => `대단해요! ${rate.toFixed(2)}% 수익이에요`,
  (rate: number) => `순항 중! ${rate.toFixed(2)}% 수익`,
];

const NEGATIVE_MESSAGES = [
  "괜찮아요, 천천히 가봐요 💪",
  "장기 투자의 힘을 믿어요 💪",
  "흔들리지 않는 투자를 응원해요 💪",
];

export function StockSummarySection() {
  const { data, isLoading, error } = useStockAnalysis();

  const messageIndex = useMemo(() => {
    const positiveIdx = Math.floor(Math.random() * POSITIVE_MESSAGES.length);
    const negativeIdx = Math.floor(Math.random() * NEGATIVE_MESSAGES.length);
    return { positiveIdx, negativeIdx };
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-gray-500">데이터를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-9 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.summary.holdingCount === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <p className="text-gray-500 mb-2">아직 보유 종목이 없어요</p>
        <Link
          href="/assets/stock/transactions/new"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          첫 거래 기록하기 →
        </Link>
      </div>
    );
  }

  const { summary } = data;
  const isPositive = summary.returnRate >= 0;
  const sign = isPositive ? "+" : "";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-[#F04452]" : "text-[#3182F6]";
  const bgColorClass = isPositive ? "bg-[#F04452]/10" : "bg-[#3182F6]/10";

  const message = isPositive
    ? POSITIVE_MESSAGES[messageIndex.positiveIdx](summary.returnRate)
    : NEGATIVE_MESSAGES[messageIndex.negativeIdx];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 총 평가금액 카드 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">주식 평가금액</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>보유 주식의 현재 가치예요</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  평가금액 = 보유수량 × 현재가
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="p-1.5 rounded-full bg-gray-100">
            <Wallet className="size-4 text-gray-500" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {formatCurrency(summary.totalValue, "KRW")}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          투자원금 {formatCurrency(summary.totalInvested, "KRW")}
        </p>
      </div>

      {/* 총 수익 카드 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">주식 수익</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>투자 원금 대비 얼마나 수익이 났는지 보여드려요</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  (평가금액 - 투자원금) ÷ 투자원금 × 100
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={cn("p-1.5 rounded-full", bgColorClass)}>
            <TrendIcon className={cn("size-4", colorClass)} />
          </div>
        </div>
        <p className={cn("text-3xl font-bold mt-2", colorClass)}>
          {sign}
          {formatCurrency(summary.totalReturn, "KRW")}
        </p>
        <p className="text-sm text-gray-500 mt-1">{message}</p>
        {summary.missingPriceCount > 0 && (
          <div className="flex items-center gap-1 mt-3 text-xs text-[#FF9F00]">
            <AlertTriangle className="size-3" />
            <span>{summary.missingPriceCount}종목 현재가 없음</span>
          </div>
        )}
      </div>

      {/* 보유 종목 수 카드 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">보유 종목</span>
          <div className="p-1.5 rounded-full bg-indigo-50">
            <BarChart3 className="size-4 text-indigo-600" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {summary.holdingCount}
          <span className="text-lg font-normal text-gray-500 ml-1">종목</span>
        </p>
      </div>
    </div>
  );
}
