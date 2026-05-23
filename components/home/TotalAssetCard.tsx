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
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500">투자원금</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalInvested, currency)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            현재 평가금액은 자산 화면에서 확인하세요
          </p>
        </div>
        <Link
          href="/assets"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
        >
          자산 보기
        </Link>
      </div>

      <div className="mt-5 text-sm">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">보유 종목</p>
          <p className="mt-1 font-semibold text-gray-900">{holdingCount}종목</p>
        </div>
      </div>
    </div>
  );
}
