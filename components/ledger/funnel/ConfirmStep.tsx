"use client";

import { format, parse } from "date-fns";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { LedgerItemFormData } from "@/lib/api/ledger";
import { formatCurrency } from "@/lib/utils/format";
import type { CategoryType } from "@/types";

interface ConfirmStepProps {
  type: "expense" | "income";
  isShared: boolean;
  items: LedgerItemFormData[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(parsed, "M월 d일");
  } catch {
    return dateStr;
  }
}

export function ConfirmStep({
  type,
  isShared,
  items,
  onSubmit,
  onBack,
  isSubmitting,
}: ConfirmStepProps) {
  const categoryType = type as CategoryType;
  const { data: categories = [] } = useCategories(categoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const pmMap = new Map(paymentMethods.map((pm) => [pm.id, pm.name]));
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const typeLabel = type === "expense" ? "지출" : "수입";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">최종 확인</h2>
      </div>

      {/* 요약 헤더 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">유형</span>
          <span className="font-semibold text-gray-900">{typeLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">공개 범위</span>
          <span className="flex items-center gap-1.5 font-semibold text-gray-900">
            {isShared ? (
              <>
                <EyeIcon className="w-4 h-4" />
                공용
              </>
            ) : (
              <>
                <EyeOffIcon className="w-4 h-4" />
                개인
              </>
            )}
          </span>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            총 {typeLabel} ({items.length}건)
          </span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const categoryName = categoryMap.get(item.categoryId) ?? "미분류";
          const methodName =
            type === "expense"
              ? item.paymentMethodId
                ? pmMap.get(item.paymentMethodId)
                : null
              : item.accountId
                ? accountMap.get(item.accountId)
                : null;

          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: confirm-only list, order never changes
              key={index}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.title || categoryName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {categoryName} · {formatDate(item.transactedAt)}
                  {methodName && ` · ${methodName}`}
                </p>
              </div>
              <span className="font-semibold text-gray-900 shrink-0">
                {formatCurrency(Number(item.amount))}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full rounded-xl py-3"
      >
        {isSubmitting ? "저장 중..." : `${items.length}건 저장하기`}
      </Button>
    </div>
  );
}
