"use client";

import {
  useLedgerStatsByCategory,
  useLedgerStatsSummary,
} from "@/hooks/use-ledger-stats";
import { ApiQueryError } from "@/lib/api/client";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { Skeleton } from "../../ui/skeleton";
import { CategoryTopPreview } from "./CategoryTopPreview";
import { SummaryStatCard } from "./SummaryStatCard";

interface LedgerAnalysisOverviewProps {
  year: number;
  month: number;
  scope: Extract<StatsScope, "shared" | "personal">;
}

function isNoHouseholdState(error: unknown) {
  return error instanceof ApiQueryError && error.isCode("HOUSEHOLD_NOT_FOUND");
}

function SummarySkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

function CategoryPreviewSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
      <Skeleton className="h-4 w-28 mb-4" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <p className="text-sm text-gray-400 text-center">{children}</p>
    </div>
  );
}

export function LedgerAnalysisOverview({
  year,
  month,
  scope,
}: LedgerAnalysisOverviewProps) {
  const summaryQuery = useLedgerStatsSummary(year, month);
  const categoryQuery = useLedgerStatsByCategory(year, month, "expense", scope);

  const scopeLabel = scope === "personal" ? "개인" : "공용";

  return (
    <>
      {summaryQuery.isLoading ? (
        <SummarySkeleton />
      ) : summaryQuery.error ? (
        <EmptyState>
          {isNoHouseholdState(summaryQuery.error)
            ? "가구 정보를 불러올 수 없어요"
            : "현금 흐름을 불러오지 못했어요"}
        </EmptyState>
      ) : summaryQuery.data ? (
        <SummaryStatCard summary={summaryQuery.data} scope={scope} />
      ) : (
        <EmptyState>
          {month}월 {scopeLabel} 요약이 없어요
        </EmptyState>
      )}

      {categoryQuery.isLoading ? (
        <CategoryPreviewSkeleton />
      ) : categoryQuery.error ? (
        <EmptyState>
          {isNoHouseholdState(categoryQuery.error)
            ? "가구 정보를 불러올 수 없어요"
            : "주요 지출을 불러오지 못했어요"}
        </EmptyState>
      ) : (
        <CategoryTopPreview
          emptyLabel={`이번 달 주요 ${scopeLabel} 지출이 없어요`}
          items={categoryQuery.data?.items ?? []}
          total={categoryQuery.data?.total ?? 0}
          title={`이번 달 주요 ${scopeLabel} 지출`}
        />
      )}
    </>
  );
}
