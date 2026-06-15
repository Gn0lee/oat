import { cn } from "@/lib/utils/cn";

type ColumnCount = 1 | 2 | 3 | 4;

interface MetricStripProps extends React.ComponentProps<"div"> {
  columns?: {
    base?: ColumnCount;
    sm?: ColumnCount;
    md?: ColumnCount;
    lg?: ColumnCount;
  };
}

const baseColumnClasses: Record<ColumnCount, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

const smColumnClasses: Record<ColumnCount, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const mdColumnClasses: Record<ColumnCount, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

const lgColumnClasses: Record<ColumnCount, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function MetricStrip({
  columns = { base: 1, md: 3 },
  className,
  ...props
}: MetricStripProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        baseColumnClasses[columns.base ?? 1],
        columns.sm && smColumnClasses[columns.sm],
        columns.md && mdColumnClasses[columns.md],
        columns.lg && lgColumnClasses[columns.lg],
        className,
      )}
      {...props}
    />
  );
}
