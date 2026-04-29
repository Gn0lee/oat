import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  totalValue: number;
  currency?: "KRW" | "USD";
}

export function TotalAssetCard({
  totalValue,
  currency = "KRW",
}: TotalAssetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <span className="text-sm text-gray-500">우리집 총 자산</span>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {formatCurrency(totalValue, currency)}
      </p>
    </div>
  );
}
