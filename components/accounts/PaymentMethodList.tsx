"use client";

import { Link2, UserRound } from "lucide-react";
import Link from "next/link";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";
import { formatCurrency } from "@/lib/utils/format";

const PAYMENT_METHOD_TYPE_LABELS: Record<string, string> = {
  credit_card: "신용카드",
  debit_card: "체크카드",
  prepaid: "선불페이",
  gift_card: "상품권",
  cash: "현금",
};

const AUXILIARY_PAYMENT_METHOD_TYPES = new Set([
  "prepaid",
  "gift_card",
  "cash",
]);

interface PaymentMethodListProps {
  action?: React.ReactNode;
}

export function PaymentMethodList({ action }: PaymentMethodListProps) {
  const { data: paymentMethods, isLoading, error } = usePaymentMethods();
  const { userId: currentUserId } = useCurrentUserId();

  if (isLoading) {
    return (
      <ScreenSection>
        <SectionHeader title="결제수단" action={action} />
        <ScreenState type="loading" title="결제수단 목록을 불러오는 중입니다" />
      </ScreenSection>
    );
  }

  if (error) {
    return (
      <ScreenSection>
        <SectionHeader title="결제수단" action={action} />
        <ScreenState
          type="error"
          title="결제수단 목록을 불러오는데 실패했습니다"
        />
      </ScreenSection>
    );
  }

  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <ScreenSection>
        <SectionHeader title="결제수단" action={action} />
        <ScreenState
          type="empty"
          title="등록된 결제수단이 없습니다."
          description="상단의 &quot;추가&quot; 버튼으로 결제수단을 등록해보세요."
        />
      </ScreenSection>
    );
  }

  return (
    <ScreenSection>
      <SectionHeader title="결제수단" action={action} />
      <GroupedList>
        {paymentMethods.map((method) => {
          const isOwner = currentUserId === method.ownerId;
          const hasBalance = AUXILIARY_PAYMENT_METHOD_TYPES.has(method.type);
          return (
            <article
              key={method.id}
              className="flex min-h-[96px] items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <Link
                href={`/ledger/payment-methods/${method.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold text-gray-900">
                      {method.name}
                    </h4>
                    {method.lastFour && (
                      <span className="text-gray-400 text-xs">
                        {method.lastFour}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-sm">
                    <span>
                      {PAYMENT_METHOD_TYPE_LABELS[method.type] || method.type}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="size-4" />
                      {method.ownerName}
                    </span>
                    <span>{method.issuer || "발급사 미입력"}</span>
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="size-4" />
                      {method.linkedAccountName || "연결 계좌 없음"}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-gray-900 text-sm sm:hidden">
                    {hasBalance
                      ? `보조잔액 ${
                          method.balance === null
                            ? "-"
                            : formatCurrency(method.balance)
                        }`
                      : "자체 잔액 없음"}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-gray-400 text-xs">
                    {hasBalance ? "보조잔액" : "잔액"}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {hasBalance
                      ? method.balance === null
                        ? "-"
                        : formatCurrency(method.balance)
                      : "-"}
                  </p>
                </div>
              </Link>
            </article>
          );
        })}
      </GroupedList>
    </ScreenSection>
  );
}
