import { formatCurrency } from "@/lib/utils/format";

interface SummaryItem {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface SummaryCardProps {
  title: string;
  items: SummaryItem[];
  valueFormatter?: (value: number) => string;
}

export function SummaryCard({
  title,
  items,
  valueFormatter = formatCurrency,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.color && (
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900">
                {valueFormatter(item.value)}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
