"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReceiptText, Wallet } from "lucide-react";
import { useRef, useState } from "react";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeSummary } from "@/hooks/use-home-summary";
import { getKstNow } from "@/lib/date";
import { CashFlowCard } from "./CashFlowCard";
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function HomePageClient() {
  const { data, isLoading, error } = useHomeSummary();
  const [cashFlowIndex, setCashFlowIndex] = useState(0);
  const direction = useRef(0);

  const handleCashFlowChange = (newIndex: number) => {
    direction.current = newIndex > cashFlowIndex ? 1 : -1;
    setCashFlowIndex(newIndex);
  };

  const cashFlow = data?.cashFlow;
  const sharedFlow = cashFlow?.shared;
  const personalFlow = cashFlow?.personal;
  const assets = data?.assets ?? {
    holdingCount: 0,
    totalInvested: 0,
  };
  const ledgerActivity = data?.ledgerActivity ?? {
    hasRecentOwnLedgerActivity: false,
    lastOwnLedgerEntryCreatedAt: null,
  };

  const month = data?.month || getKstNow().getMonth() + 1;

  const activeFlow = cashFlowIndex === 0 ? sharedFlow : personalFlow;
  const activeTitle = cashFlowIndex === 0 ? "공용 현금흐름" : "내 현금흐름";

  return (
    <>
      {isLoading ? (
        <HomeSummarySkeleton />
      ) : error || !data ? (
        <HomeErrorState />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="overflow-hidden">
              <AnimatePresence
                mode="wait"
                initial={false}
                custom={direction.current}
              >
                <motion.div
                  key={cashFlowIndex}
                  custom={direction.current}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <CashFlowCard
                    title={activeTitle}
                    totalIncome={activeFlow?.totalIncome ?? 0}
                    totalExpense={activeFlow?.totalExpense ?? 0}
                    balance={activeFlow?.balance ?? 0}
                    savingsRate={activeFlow?.savingsRate ?? 0}
                    month={month}
                    hasRecentOwnLedgerActivity={
                      ledgerActivity.hasRecentOwnLedgerActivity
                    }
                    lastOwnLedgerEntryCreatedAt={
                      ledgerActivity.lastOwnLedgerEntryCreatedAt
                    }
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-2">
              {["공용", "개인"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${label} 현금흐름 보기`}
                  onClick={() => handleCashFlowChange(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    cashFlowIndex === index
                      ? "w-6 bg-primary"
                      : "w-2.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          <TotalAssetCard
            holdingCount={assets.holdingCount}
            totalInvested={assets.totalInvested}
          />

          <HomeTopCategories items={data.topCategories.items} />
        </div>
      )}

      <ScreenSection className="mt-6">
        <SectionHeader title="바로가기" />
        <GroupedList>
          <EntryRow
            icon={ReceiptText}
            title="가계부"
            description="수입과 지출을 기록해요"
            href="/ledger"
          />
          <EntryRow
            icon={Wallet}
            title="자산"
            description="가족 자산을 확인해요"
            href="/assets"
          />
        </GroupedList>
      </ScreenSection>
    </>
  );
}
