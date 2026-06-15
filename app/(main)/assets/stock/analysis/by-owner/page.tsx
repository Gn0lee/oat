"use client";

import {
  StockOwnerAllocationSection,
  StockOwnerHoldingsList,
  StockOwnerSummary,
} from "@/components/assets/stock/analysis/by-owner";
import { PageContainer } from "@/components/layout";
import { useStockOwnerAnalysis } from "@/hooks/use-stock-owner-analysis";

export default function StockOwnerAnalysisPage() {
  const { data, isLoading, error } = useStockOwnerAnalysis();

  const isEmpty = !isLoading && (!data || data.summary.length === 0);

  return (
    <PageContainer maxWidth="default">
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
          <StockOwnerSummary data={data?.summary ?? []} isLoading={isLoading} />

          {/* 차트 섹션 */}
          <StockOwnerAllocationSection
            data={data?.summary ?? []}
            isLoading={isLoading}
          />

          {/* 소유자별 상세 리스트 */}
          <StockOwnerHoldingsList
            data={data?.holdings ?? []}
            isLoading={isLoading}
          />
        </>
      )}
    </PageContainer>
  );
}
