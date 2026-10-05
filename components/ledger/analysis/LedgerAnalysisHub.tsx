"use client";

import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useLedgerAnalysisUrl } from "@/hooks/use-ledger-analysis-url";
import { useLedgerBook } from "@/hooks/use-ledger-books";
import { LedgerAnalysisOverview } from "./LedgerAnalysisOverview";

const NAV_CARDS = [
  {
    key: "by-category",
    icon: PieChart,
    title: "카테고리 분석",
    description: "카테고리별 지출·수입 비중 확인",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    key: "by-member",
    icon: Users,
    title: "구성원별 지출",
    description: "공용 지출에서 누가 얼마나 결제했는지",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    key: "by-payment-method",
    icon: CreditCard,
    title: "결제수단 분석",
    description: "어떤 카드·페이로 지출했는지",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    key: "trend",
    icon: TrendingUp,
    title: "월별 수입·지출",
    description: "최근 6개월 수입·지출 흐름",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    key: "daily",
    icon: CalendarDays,
    title: "일별 지출 현황",
    description: "날짜별 소비 패턴",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
];

export function LedgerAnalysisHub() {
  const { bookId, year, month, hrefFor } = useLedgerAnalysisUrl();
  const { data: book } = useLedgerBook(bookId ?? "");

  return (
    <>
      <LedgerAnalysisOverview
        year={year}
        month={month}
        bookId={bookId}
        bookName={bookId ? book?.name : undefined}
      />

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 px-1">
          분석 보기
        </h3>
        {NAV_CARDS.map(({ key, icon: Icon, title, description, color, bg }) => (
          <Link
            key={key}
            href={hrefFor(`/ledger/analysis/${key}`)}
            className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </Link>
        ))}
      </div>
    </>
  );
}
