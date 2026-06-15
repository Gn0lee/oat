"use client";

import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetsSummary } from "@/hooks/use-assets-summary";
import { BASE_ASSET_TYPE_CONFIG } from "@/lib/constants/assets";
import { formatCurrency } from "@/lib/utils/format";

function AssetsSummarySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-2xl bg-gray-200" />
      <AssetEntrySections />
    </div>
  );
}

function AssetsErrorState() {
  return (
    <div className="rounded-xl bg-white p-6 text-center ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">
        자산 데이터를 불러오지 못했습니다.
      </p>
    </div>
  );
}

function AssetEntrySections() {
  const stock = BASE_ASSET_TYPE_CONFIG.stock;
  const cash = BASE_ASSET_TYPE_CONFIG.cash;
  const realEstate = BASE_ASSET_TYPE_CONFIG["real-estate"];
  const other = BASE_ASSET_TYPE_CONFIG.other;

  return (
    <>
      <ScreenSection>
        <SectionHeader title="자산 관리" />
        <GroupedList>
          <EntryRow
            icon={stock.icon}
            title="주식"
            description="보유 종목과 거래 내역을 관리해요"
            href="/assets/stock"
          />
          <EntryRow
            icon={cash.icon}
            title="현금/계좌"
            description="계좌와 현금성 자산을 관리해요"
            href="/assets/accounts"
          />
        </GroupedList>
      </ScreenSection>

      <ScreenSection>
        <SectionHeader title="준비 중" />
        <GroupedList>
          <EntryRow
            icon={realEstate.icon}
            title={realEstate.label}
            description="부동산 자산 관리를 준비하고 있어요"
            disabled
            trailing={
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400">
                준비 중
              </span>
            }
          />
          <EntryRow
            icon={other.icon}
            title={other.label}
            description="기타 자산 관리를 준비하고 있어요"
            disabled
            trailing={
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400">
                준비 중
              </span>
            }
          />
        </GroupedList>
      </ScreenSection>
    </>
  );
}

export function AssetsPageClient() {
  const { data, isLoading, error } = useAssetsSummary();

  if (isLoading) {
    return <AssetsSummarySkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AssetsErrorState />
        <AssetEntrySections />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <span className="text-sm text-gray-500">총 자산</span>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {formatCurrency(data.portfolio.totalValue)}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          우리 가족의 모든 자산을 한눈에 관리하세요
        </p>
      </div>

      <AssetEntrySections />
    </div>
  );
}
