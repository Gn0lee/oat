import {
  AlertTriangle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface TotalReturnCardProps {
  totalReturn: number;
  returnRate: number;
  missingPriceCount?: number;
  stalePriceCount?: number;
  isLoading?: boolean;
}

export function TotalReturnCard({
  totalReturn,
  returnRate,
  missingPriceCount = 0,
  stalePriceCount = 0,
  isLoading,
}: TotalReturnCardProps) {
  const messageIndex = useMemo(() => {
    const positiveIdx = Math.floor(Math.random() * POSITIVE_MESSAGES.length);
    const negativeIdx = Math.floor(Math.random() * NEGATIVE_MESSAGES.length);
    return { positiveIdx, negativeIdx };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-9 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const isPositive = returnRate >= 0;
  const sign = isPositive ? "+" : "";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-[#F04452]" : "text-[#3182F6]";
  const bgColorClass = isPositive ? "bg-[#F04452]/10" : "bg-[#3182F6]/10";

  const message = isPositive
    ? POSITIVE_MESSAGES[messageIndex.positiveIdx](returnRate)
    : NEGATIVE_MESSAGES[messageIndex.negativeIdx];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">총 수익</span>
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
              <p>투자 원금 대비 현재 얼마나 수익이 났는지 보여드려요</p>
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
        {formatCurrency(totalReturn, "KRW")}
      </p>
      <p className="text-sm text-gray-500 mt-1">{message}</p>
      {missingPriceCount > 0 && (
        <div className="flex items-center gap-1 mt-3 text-xs text-[#FF9F00]">
          <AlertTriangle className="size-3" />
          <span>{missingPriceCount}종목 현재가 없음</span>
        </div>
      )}
      {stalePriceCount > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <AlertTriangle className="size-3" />
          <span>{stalePriceCount}종목 이전 가격 기준</span>
        </div>
      )}
    </div>
  );
}
