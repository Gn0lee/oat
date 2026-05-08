import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

interface TotalAssetCardProps {
  totalValue: number;
  holdingCount?: number;
  totalInvested?: number;
  returnRate?: number;
  currency?: "KRW" | "USD";
}

export function TotalAssetCard({
  totalValue,
  holdingCount = 0,
  totalInvested = 0,
  returnRate = 0,
  currency = "KRW",
}: TotalAssetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500">지금 우리집 자산은</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalValue, currency)}
          </p>
        </div>
        <Link
          href="/assets"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
        >
          자산 보기
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">보유</p>
          <p className="mt-1 font-semibold text-gray-900">{holdingCount}종목</p>
        </div>
        <div className="col-span-2 rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">투자 요약</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-gray-900">
              투자원금 {formatCurrency(totalInvested, currency)}
            </span>
            <span
              className={`font-semibold ${returnRate >= 0 ? "text-red-500" : "text-blue-500"}`}
            >
              수익률 {formatPercent(returnRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
