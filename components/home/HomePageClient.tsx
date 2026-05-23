"use client";

import { ChartPie, ReceiptText, Settings, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeSummary } from "@/hooks/use-home-summary";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import { CashFlowCard } from "./CashFlowCard";
import { FamilyExpenseCard } from "./FamilyExpenseCard";
import { FeatureCard } from "./FeatureCard";
import { HomeTopCategories } from "./HomeTopCategories";
import { TotalAssetCard } from "./TotalAssetCard";

function HomeSummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-2xl bg-gray-200" />
      <Skeleton className="h-40 rounded-2xl bg-gray-200" />
      <Skeleton className="h-28 rounded-2xl bg-gray-200" />
      <Skeleton className="h-32 rounded-2xl bg-gray-200" />
    </div>
  );
}

function HomeErrorState() {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
      <p className="text-sm text-gray-500">홈 데이터를 불러오지 못했습니다.</p>
    </div>
  );
}

export function HomePageClient() {
  const { data, isLoading, error } = useHomeSummary();

  const cashFlow = data?.cashFlow;
  const assets = data?.assets ?? {
    holdingCount: 0,
    totalInvested: 0,
  };
  const ledgerActivity = data?.ledgerActivity ?? {
    hasRecentOwnLedgerActivity: false,
    lastOwnLedgerEntryCreatedAt: null,
  };

  const month = data?.month || new Date().getMonth() + 1;

  const ledgerHint = cashFlow
    ? cashFlow.totalExpense > 0
      ? `이번 달 지출 ${formatCurrency(cashFlow.totalExpense)}`
      : "이번 달 기록이 없어요"
    : "기록을 시작해보세요";

  const assetHint =
    assets.holdingCount > 0
      ? `${assets.holdingCount}종목 · ${formatCompactNumber(assets.totalInvested)}`
      : "자산을 등록해보세요";

  const analysisHint = cashFlow?.totalExpense
    ? `저축률 ${cashFlow.savingsRate.toFixed(0)}%`
    : "기록 후 분석이 가능해요";

  return (
    <>
      {isLoading ? (
        <HomeSummarySkeleton />
      ) : error || !data ? (
        <HomeErrorState />
      ) : (
        <div className="space-y-4">
          <CashFlowCard
            totalIncome={cashFlow?.totalIncome ?? 0}
            totalExpense={cashFlow?.totalExpense ?? 0}
            balance={cashFlow?.balance ?? 0}
            savingsRate={cashFlow?.savingsRate ?? 0}
            month={month}
            hasRecentOwnLedgerActivity={
              ledgerActivity.hasRecentOwnLedgerActivity
            }
            lastOwnLedgerEntryCreatedAt={
              ledgerActivity.lastOwnLedgerEntryCreatedAt
            }
          />

          <TotalAssetCard
            holdingCount={assets.holdingCount}
            totalInvested={assets.totalInvested}
          />

          <HomeTopCategories items={data.topCategories.items} />

          <FamilyExpenseCard
            sharedExpense={cashFlow?.totalSharedExpense ?? 0}
            personalExpense={cashFlow?.totalPersonalExpense ?? 0}
          />
        </div>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-sm text-gray-400">더 자세히 보기</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <FeatureCard
          icon={ReceiptText}
          title="가계부"
          description="수입과 지출을 기록해요"
          hint={ledgerHint}
          href="/ledger"
          colorScheme="amber"
        />
        <FeatureCard
          icon={Wallet}
          title="자산"
          description="투자 현황을 파악해요"
          hint={assetHint}
          href="/assets"
          colorScheme="blue"
        />
        <FeatureCard
          icon={ChartPie}
          title="지출 분석"
          description="소비 패턴을 분석해요"
          hint={analysisHint}
          href="/ledger/analysis"
          colorScheme="emerald"
        />
        <FeatureCard
          icon={Settings}
          title="설정"
          description="앱 사용 환경을 관리해요"
          hint="설정 관리"
          href="/settings"
          colorScheme="violet"
        />
      </div>
    </>
  );
}
