"use client";

import { useDashboardSummary } from "@/hooks/use-dashboard";
import { SummaryCard } from "./SummaryCard";
import { TotalAssetCard } from "./TotalAssetCard";
import { TotalReturnCard } from "./TotalReturnCard";

// 자산 유형 라벨 매핑
const ASSET_TYPE_LABELS: Record<string, string> = {
  equity: "주식",
  bond: "채권",
  cash: "현금",
  alternative: "대체투자",
  real_estate: "부동산",
  commodity: "원자재",
  crypto: "암호화폐",
};

// 자산 유형 색상 매핑
const ASSET_TYPE_COLORS: Record<string, string> = {
  equity: "#4F46E5",
  bond: "#03B26C",
  cash: "#8B95A1",
  alternative: "#FF9F00",
  real_estate: "#F04452",
  commodity: "#8B5CF6",
  crypto: "#EC4899",
};

// 멤버 색상 (순서대로 할당)
const MEMBER_COLORS = ["#4F46E5", "#03B26C", "#FF9F00", "#F04452", "#8B95A1"];

export function DashboardSummarySection() {
  const { data, isLoading, error } = useDashboardSummary();

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          데이터를 불러오는데 실패했습니다.
        </p>
      </div>
    );
  }

  // 멤버별 요약 데이터 변환
  const byMemberItems =
    data?.byMember.map((member, index) => ({
      label: member.memberName,
      value: member.totalValue,
      percentage: member.percentage,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    })) ?? [];

  // 자산군별 요약 데이터 변환
  const byAssetClassItems =
    data?.byAssetClass.map((assetClass) => ({
      label: ASSET_TYPE_LABELS[assetClass.assetClass] ?? assetClass.assetClass,
      value: assetClass.totalValue,
      percentage: assetClass.percentage,
      color: ASSET_TYPE_COLORS[assetClass.assetClass] ?? "#8B95A1",
    })) ?? [];

  const isEmpty = !isLoading && data && data.totalInvested === 0;

  if (isEmpty) {
    return (
      <>
        {/* 총 자산 / 수익률 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TotalAssetCard totalValue={0} totalInvested={0} isLoading={false} />
          <TotalReturnCard totalReturn={0} returnRate={0} isLoading={false} />
        </div>
        {/* 빈 상태 메시지 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-500">
            아직 보유 종목이 없습니다. 거래를 등록해주세요.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 총 자산 / 수익률 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TotalAssetCard
          totalValue={data?.totalValue ?? 0}
          totalInvested={data?.totalInvested ?? 0}
          isLoading={isLoading}
        />
        <TotalReturnCard
          totalReturn={data?.totalReturn ?? 0}
          returnRate={data?.returnRate ?? 0}
          missingPriceCount={data?.missingPriceCount}
          isLoading={isLoading}
        />
      </div>

      {/* 구성원별 / 자산군별 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-full bg-gray-200 rounded" />
                <div className="h-6 w-full bg-gray-200 rounded" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-full bg-gray-200 rounded" />
                <div className="h-6 w-full bg-gray-200 rounded" />
              </div>
            </div>
          </>
        ) : (
          <>
            {byMemberItems.length > 0 && (
              <SummaryCard title="구성원별 자산" items={byMemberItems} />
            )}
            {byAssetClassItems.length > 0 && (
              <SummaryCard title="자산군별 비중" items={byAssetClassItems} />
            )}
          </>
        )}
      </div>
    </>
  );
}
