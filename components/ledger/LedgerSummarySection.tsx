"use client";

import { useState } from "react";
import { useLedgerEntrySummary } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/format";
import { Skeleton } from "../ui/skeleton";

interface LedgerSummarySectionProps {
  year: number;
  month: number;
}

function isNoHouseholdState(error: unknown) {
  return error instanceof ApiQueryError && error.isCode("HOUSEHOLD_NOT_FOUND");
}

export function LedgerSummarySection({
  year,
  month,
}: LedgerSummarySectionProps) {
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  const {
    data: summary,
    isLoading,
    error,
  } = useLedgerEntrySummary(year, month, scope);

  const title = scope === "shared" ? "공용 현금흐름" : "내 현금흐름";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm text-gray-500">
          {month}월 {title}
        </h2>
        <div className="rounded-full bg-gray-100 p-0.5">
          {(["shared", "personal"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScope(item)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                scope === item
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {item === "shared" ? "공용" : "개인"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="h-px bg-gray-100 w-full" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {isNoHouseholdState(error)
            ? "가구 정보를 불러올 수 없어요"
            : "월 현금 흐름을 불러오지 못했어요"}
        </p>
      ) : summary ? (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-gray-700">남은 금액</span>
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(summary.balance)}
            </span>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">수입</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">지출</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(summary.totalExpense)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          이번 달 수입/지출 내역이 없어요
        </p>
      )}
    </div>
  );
}
