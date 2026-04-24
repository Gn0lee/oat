import { ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";

export default function LedgerPage() {
  return (
    <>
      <PageHeader title="가계부" />
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm mb-4">
        <p className="text-lg font-medium">준비 중입니다</p>
        <p className="mt-2 text-sm">가계부 기능이 곧 추가됩니다.</p>
      </div>

      <Link
        href="/ledger/payment-methods"
        className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-gray-900 truncate">
            결제수단 관리
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </Link>
    </>
  );
}
