"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SummaryCard } from "@/components/dashboard";
import { useDashboardSummary } from "@/hooks/use-dashboard";

const ASSET_TYPE_LABELS: Record<string, string> = {
  equity: "주식",
  bond: "채권",
  cash: "현금",
  alternative: "대체투자",
  real_estate: "부동산",
  commodity: "원자재",
  crypto: "암호화폐",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  equity: "#4F46E5",
  bond: "#03B26C",
  cash: "#8B95A1",
  alternative: "#FF9F00",
  real_estate: "#F04452",
  commodity: "#8B5CF6",
  crypto: "#EC4899",
};

export default function ByAssetTypeAnalysisPage() {
  const { data, isLoading, error } = useDashboardSummary();

  const byAssetClassItems =
    data?.byAssetClass.map((assetClass) => ({
      label: ASSET_TYPE_LABELS[assetClass.assetClass] ?? assetClass.assetClass,
      value: assetClass.totalValue,
      percentage: assetClass.percentage,
      color: ASSET_TYPE_COLORS[assetClass.assetClass] ?? "#8B95A1",
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
          <h1 className="text-2xl font-bold text-gray-900">자산군별 분석</h1>
          <p className="text-sm text-gray-500">
            주식, 채권, 현금 등 자산군 비중
          </p>
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
            거래를 등록하면 자산군별 비중을 확인할 수 있어요
          </p>
        </div>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && byAssetClassItems.length > 0 && (
        <SummaryCard title="자산군별 비중" items={byAssetClassItems} />
      )}
    </>
  );
}
