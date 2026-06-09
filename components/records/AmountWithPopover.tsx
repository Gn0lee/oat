"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils/format";

interface AmountWithPopoverProps {
  amount: number;
  currency?: "KRW" | "USD";
  sign?: string;
  className?: string;
  compactThreshold?: number;
}

export function AmountWithPopover({
  amount,
  currency = "KRW",
  sign = "",
  className,
  compactThreshold = 1_000_000,
}: AmountWithPopoverProps) {
  const shouldCompact = Math.abs(amount) >= compactThreshold;
  const fullAmount = `${sign}${formatCurrency(amount, currency)}`;
  const displayAmount = `${sign}${
    shouldCompact
      ? formatCompactCurrency(amount, currency)
      : formatCurrency(amount, currency)
  }`;

  if (!shouldCompact) {
    return <span className={className}>{displayAmount}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-pointer text-left tabular-nums underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
            className,
          )}
          aria-label={`전체 금액 ${fullAmount}`}
        >
          {displayAmount}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 text-sm" align="start">
        <p className="text-xs text-gray-500">전체 금액</p>
        <p className="mt-1 font-semibold text-gray-900 tabular-nums">
          {fullAmount}
        </p>
      </PopoverContent>
    </Popover>
  );
}
