"use client";

import { useDashboardSummary } from "@/hooks/use-dashboard";
import { TotalAssetCard } from "./TotalAssetCard";
import { TotalReturnCard } from "./TotalReturnCard";

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

  const isEmpty = !isLoading && data && data.totalInvested === 0;

  if (isEmpty) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TotalAssetCard totalValue={0} totalInvested={0} isLoading={false} />
          <TotalReturnCard totalReturn={0} returnRate={0} isLoading={false} />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-500">
            아직 보유 종목이 없습니다. 거래를 등록해주세요.
          </p>
        </div>
      </>
    );
  }

  return (
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
  );
}
