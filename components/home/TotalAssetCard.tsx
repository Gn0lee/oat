import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  holdingCount?: number;
  totalInvested?: number;
  currency?: "KRW" | "USD";
}

export function TotalAssetCard({
  holdingCount = 0,
  totalInvested = 0,
  currency = "KRW",
}: TotalAssetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm relative">
      <div>
        <span className="text-sm text-gray-500">투자원금</span>
        <p className="text-3xl font-bold text-gray-900 mt-1 break-all">
          {formatCurrency(totalInvested, currency)}
        </p>
      </div>
      <Link
        href="/assets"
        className="absolute top-6 right-6 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
      >
        자산 보기
      </Link>

      <div className="mt-5 text-sm">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">보유 종목</p>
          <p className="mt-1 font-semibold text-gray-900">{holdingCount}종목</p>
        </div>
      </div>
    </div>
  );
}
