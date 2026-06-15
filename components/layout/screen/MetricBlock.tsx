import { cn } from "@/lib/utils/cn";

interface MetricBlockProps extends React.ComponentProps<"div"> {
  label: React.ReactNode;
  value: React.ReactNode;
  supporting?: React.ReactNode;
  delta?: React.ReactNode;
  tone?: "neutral" | "increase" | "decrease" | "muted";
  emphasis?: boolean;
}

const toneClasses = {
  neutral: "text-gray-900",
  increase: "text-red-500",
  decrease: "text-blue-500",
  muted: "text-gray-500",
};

export function MetricBlock({
  label,
  value,
  supporting,
  delta,
  tone = "neutral",
  emphasis = false,
  className,
  ...props
}: MetricBlockProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)} {...props}>
      <p className="truncate text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "min-w-0 font-bold leading-tight tabular-nums [overflow-wrap:anywhere]",
          emphasis ? "text-xl" : "text-lg",
          toneClasses[tone],
        )}
      >
        {value}
      </p>
      {(supporting || delta) && (
        <p className="truncate text-xs text-gray-500">
          {supporting}
          {supporting && delta ? " · " : null}
          {delta}
        </p>
      )}
    </div>
  );
}
