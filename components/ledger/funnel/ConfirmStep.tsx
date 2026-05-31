"use client";

import { UserIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type {
  LedgerItemFormData,
  TransferItemFormData,
} from "@/lib/api/ledger";
import { formatKst, toKstDate } from "@/lib/date";
import { formatCurrency } from "@/lib/utils/format";
import type { CategoryType } from "@/types";

interface ConfirmStepProps {
  type: "expense" | "income" | "transfer";
  isShared: boolean;
  items?: LedgerItemFormData[];
  transferItem?: TransferItemFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return formatKst(toKstDate(dateStr), "M월 d일");
  } catch {
    return dateStr;
  }
}

export function ConfirmStep({
  type,
  isShared,
  items = [],
  transferItem,
  onSubmit,
  isSubmitting,
}: ConfirmStepProps) {
  const categoryType = type === "transfer" ? undefined : (type as CategoryType);
  const { data: categories = [] } = useCategories(categoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const pmMap = new Map(paymentMethods.map((pm) => [pm.id, pm.name]));
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const totalAmount =
    type === "transfer" && transferItem
      ? Number(transferItem.amount)
      : items.reduce((sum, item) => sum + Number(item.amount), 0);
  const typeLabel =
    type === "expense" ? "지출" : type === "income" ? "수입" : "이체";
  const itemCount = type === "transfer" ? 1 : items.length;

  const getTransferLocationName = (
    location: TransferItemFormData["from"],
  ): string => {
    if (location.kind === "account") {
      return accountMap.get(location.id) ?? "계좌";
    }
    return pmMap.get(location.id) ?? "결제수단";
  };

  return (
    <div className="space-y-6">
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
                <UsersIcon className="w-4 h-4" />
                공용
              </>
            ) : (
              <>
                <UserIcon className="w-4 h-4" />
                개인
              </>
            )}
          </span>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            총 {typeLabel} ({itemCount}건)
          </span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="space-y-2">
        {type === "transfer" && transferItem && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {transferItem.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {getTransferLocationName(transferItem.from)} →{" "}
                {getTransferLocationName(transferItem.to)} ·{" "}
                {formatDate(transferItem.transactedAt)}
              </p>
            </div>
            <span className="font-semibold text-gray-900 shrink-0">
              {formatCurrency(Number(transferItem.amount))}
            </span>
          </div>
        )}

        {type !== "transfer" &&
          items.map((item, index) => {
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
        {isSubmitting ? "저장 중..." : `${itemCount}건 저장하기`}
      </Button>
    </div>
  );
}
