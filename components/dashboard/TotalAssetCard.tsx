import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  totalValue: number;
  totalInvested: number;
  isLoading?: boolean;
}

export function TotalAssetCard({
  totalValue,
  totalInvested,
  isLoading,
}: TotalAssetCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-9 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <span className="text-sm text-gray-500">총 자산</span>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {formatCurrency(totalValue, "KRW")}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        투자원금 {formatCurrency(totalInvested, "KRW")}
      </p>
    </div>
  );
}
