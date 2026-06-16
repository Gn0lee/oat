import { cn } from "@/lib/utils/cn";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils/format";

export type AmountTone =
  | "neutral"
  | "income"
  | "expense"
  | "increase"
  | "decrease"
  | "muted";

interface AmountTextProps extends React.ComponentProps<"span"> {
  amount?: number;
  value?: React.ReactNode;
  currency?: "KRW" | "USD";
  sign?: string;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  tone?: AmountTone;
  align?: "left" | "right" | "center";
}

const toneClasses: Record<AmountTone, string> = {
  neutral: "text-gray-900",
  income: "text-red-500",
  expense: "text-blue-500",
  increase: "text-red-500",
  decrease: "text-blue-500",
  muted: "text-gray-500",
};

const alignClasses = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function AmountText({
  amount,
  value,
  currency = "KRW",
  sign = "",
  prefix = "",
  suffix = "",
  compact = false,
  tone = "neutral",
  align = "right",
  className,
  ...props
}: AmountTextProps) {
  const formattedValue =
    value ??
    (typeof amount === "number"
      ? compact
        ? formatCompactCurrency(amount, currency)
        : formatCurrency(amount, currency)
      : "");

  return (
    <span
      className={cn(
        "inline-block min-w-0 max-w-full font-semibold tabular-nums leading-tight [overflow-wrap:anywhere]",
        toneClasses[tone],
        alignClasses[align],
        className,
      )}
      {...props}
    >
      {prefix}
      {sign}
      {formattedValue}
      {suffix}
    </span>
  );
}
