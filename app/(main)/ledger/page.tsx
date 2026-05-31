import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  PieChart,
  Plus,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { LedgerSummarySection } from "@/components/ledger/LedgerSummarySection";
import { getKstNow } from "@/lib/date";
import { requireUser } from "@/lib/supabase/auth";

export default async function LedgerPage() {
  await requireUser();

  const now = getKstNow();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <>
      <LedgerSummarySection year={year} month={month} />

      {/* 기능 진입점 목록 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 px-1">기능</h3>

        <Link
          href="/ledger/records/new/full"
          className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">기록 추가</p>
              <p className="text-xs text-gray-500 mt-0.5">
                수입, 지출, 이체 내역 등록
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </Link>

        <Link
          href="/ledger/records"
          className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">기록 조회</p>
              <p className="text-xs text-gray-500 mt-0.5">
                달력에서 수입/지출 내역 확인
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </Link>

        <Link
          href="/ledger/payment-methods"
          className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">결제수단 관리</p>
              <p className="text-xs text-gray-500 mt-0.5">
                카드, 페이, 상품권 등록 및 관리
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </Link>

        <Link
          href="/ledger/categories"
          className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Tags className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">카테고리 관리</p>
              <p className="text-xs text-gray-500 mt-0.5">
                우리 가족만의 소비 카테고리 설정
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </Link>

        <Link
          href="/ledger/analysis"
          className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">통계 대시보드</p>
              <p className="text-xs text-gray-500 mt-0.5">
                우리 가족의 소비 패턴과 다양한 분석 지표
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </Link>
      </div>
    </>
  );
}
