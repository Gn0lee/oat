import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  totalInvested: number;
  currency?: "KRW" | "USD";
}

export function TotalAssetCard({
  totalInvested,
  currency = "KRW",
}: TotalAssetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <span className="text-sm text-gray-500">우리집 총 투자금액</span>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {formatCurrency(totalInvested, currency)}
      </p>
    </div>
  );
}
