"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { AmountText, type AmountTone } from "./AmountText";

interface AmountDisclosureProps {
  amount?: number;
  currency?: "KRW" | "USD";
  sign?: string;
  tone?: AmountTone;
  align?: "left" | "right";
  className?: string;
  amountClassName?: string;
  compactThreshold?: number;
}

export function AmountDisclosure({
  amount = 0,
  currency = "KRW",
  sign = "",
  tone = "neutral",
  align = "right",
  className,
  amountClassName,
  compactThreshold = 1_000_000,
}: AmountDisclosureProps) {
  const shouldCompact = Math.abs(amount) >= compactThreshold;
  const formattedFull = formatCurrency(amount, currency);
  const fullAmount = `${sign}${formattedFull}`;

  if (!shouldCompact) {
    return (
      <AmountText
        amount={amount}
        currency={currency}
        sign={sign}
        tone={tone}
        align={align}
        className={cn(className, amountClassName)}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-pointer text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
            className,
          )}
          aria-label={`전체 금액 ${fullAmount}`}
        >
          <AmountText
            amount={amount}
            currency={currency}
            sign={sign}
            tone={tone}
            align={align}
            compact
            className={amountClassName}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 text-sm" align="start">
        <p className="text-xs text-gray-500">전체 금액</p>
        <p className="mt-1">
          <AmountText
            amount={amount}
            currency={currency}
            sign={sign}
            tone="neutral"
            align="left"
          />
        </p>
      </PopoverContent>
    </Popover>
  );
}
