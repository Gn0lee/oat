"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAssetsSummary } from "@/hooks/use-assets-summary";
import { formatCurrency } from "@/lib/utils/format";
import { AssetTypeCard } from "./common/AssetTypeCard";

function AssetsSummarySkeleton() {
  return (
    <>
      <Skeleton className="h-36 rounded-2xl bg-gray-200" />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="border-b border-gray-100 last:border-b-0">
            <AssetTypeCard type="stock" isLoading />
          </div>
        ))}
      </div>
    </>
  );
}

function AssetsErrorState() {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
      <p className="text-sm text-gray-500">
        자산 데이터를 불러오지 못했습니다.
      </p>
    </div>
  );
}

export function AssetsPageClient() {
  const { data, isLoading, error } = useAssetsSummary();

  if (isLoading) {
    return <AssetsSummarySkeleton />;
  }

  if (error || !data) {
    return <AssetsErrorState />;
  }

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <span className="text-sm text-gray-500">총 자산</span>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {formatCurrency(data.portfolio.totalValue)}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          우리 가족의 모든 자산을 한눈에 관리하세요
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
        <AssetTypeCard
          type="stock"
          holdingCount={data.portfolio.holdingCount}
          totalValue={data.portfolio.totalValue}
          returnRate={data.portfolio.returnRate}
        />
        <AssetTypeCard
          type="cash"
          holdingCount={data.accountCount}
          countLabel="계좌"
          emptyText="아직 등록된 계좌가 없어요"
          activeActionText="관리하기"
          showValue={false}
        />
        <AssetTypeCard type="real-estate" disabled />
        <AssetTypeCard type="other" disabled />
      </div>
    </>
  );
}
