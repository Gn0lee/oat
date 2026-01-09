"use client";

import {
  OwnerAllocationChart,
  OwnerAssetList,
  OwnerSummaryCards,
} from "@/components/dashboard/by-owner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOwnerAnalysis } from "@/hooks/use-owner-analysis";

export default function ByOwnerAnalysisPage() {
  const { data, isLoading, error } = useOwnerAnalysis();

  const isEmpty = !isLoading && (!data || data.summary.length === 0);

  return (
    <>
      <PageHeader
        title="소유자별 분석"
        subtitle="가족 구성원별 자산 비중"
        backHref="/dashboard"
      />

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
      {!error && (
        <>
          {/* 소유자별 요약 카드 */}
          <OwnerSummaryCards data={data?.summary ?? []} isLoading={isLoading} />

          {/* 차트 섹션 */}
          <OwnerAllocationChart
            data={data?.summary ?? []}
            isLoading={isLoading}
          />

          {/* 소유자별 상세 리스트 */}
          <OwnerAssetList data={data?.holdings ?? []} isLoading={isLoading} />
        </>
      )}
    </>
  );
}
