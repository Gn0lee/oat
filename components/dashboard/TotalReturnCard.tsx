import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

interface TotalReturnCardProps {
  totalReturn: number;
  returnRate: number;
  missingPriceCount?: number;
  isLoading?: boolean;
}

export function TotalReturnCard({
  totalReturn,
  returnRate,
  missingPriceCount = 0,
  isLoading,
}: TotalReturnCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const isPositive = returnRate >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <span className="text-sm text-gray-500">총 수익률</span>
      <p
        className={cn(
          "text-3xl font-bold mt-1",
          isPositive ? "text-positive" : "text-negative",
        )}
      >
        {formatPercent(returnRate)}
      </p>
      <p
        className={cn(
          "text-sm mt-2",
          isPositive ? "text-positive" : "text-negative",
        )}
      >
        {isPositive ? "+" : ""}
        {formatCurrency(totalReturn, "KRW")}
      </p>
      {missingPriceCount > 0 && (
        <div className="flex items-center gap-1 mt-3 text-xs text-warning">
          <AlertTriangle className="size-3" />
          <span>{missingPriceCount}종목 현재가 없음</span>
        </div>
      )}
    </div>
  );
}
