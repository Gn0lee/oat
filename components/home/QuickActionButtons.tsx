import Link from "next/link";

export function QuickActionButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/ledger/new?type=expense"
        className="flex items-center justify-center gap-2 min-h-[44px] bg-white rounded-2xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        + 지출
      </Link>
      <Link
        href="/ledger/new?type=income"
        className="flex items-center justify-center gap-2 min-h-[44px] bg-white rounded-2xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        + 수입
      </Link>
    </div>
  );
}
