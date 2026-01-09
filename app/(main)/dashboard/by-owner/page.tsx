"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SummaryCard } from "@/components/dashboard";
import { useDashboardSummary } from "@/hooks/use-dashboard";

const MEMBER_COLORS = ["#4F46E5", "#03B26C", "#FF9F00", "#F04452", "#8B95A1"];

export default function ByOwnerAnalysisPage() {
  const { data, isLoading, error } = useDashboardSummary();

  const byMemberItems =
    data?.byMember.map((member, index) => ({
      label: member.memberName,
      value: member.totalValue,
      percentage: member.percentage,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    })) ?? [];

  const isEmpty = !isLoading && (!data || data.totalInvested === 0);

  return (
    <>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">소유자별 분석</h1>
          <p className="text-sm text-gray-500">가족 구성원별 자산 비중</p>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-6 w-full bg-gray-200 rounded" />
            <div className="h-6 w-full bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            데이터를 불러오는데 실패했습니다.
          </p>
        </div>
      )}

      {/* 빈 상태 */}
      {isEmpty && !error && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-500">아직 보유 종목이 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">
            거래를 등록하면 소유자별 비중을 확인할 수 있어요
          </p>
        </div>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && byMemberItems.length > 0 && (
        <SummaryCard title="구성원별 자산" items={byMemberItems} />
      )}
    </>
  );
}
