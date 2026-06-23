"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
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
          const _isOwner = currentUserId === method.ownerId;
          const hasBalance = AUXILIARY_PAYMENT_METHOD_TYPES.has(method.type);
          const typeLabel =
            PAYMENT_METHOD_TYPE_LABELS[method.type] || method.type;

          const detailSegments: string[] = [];
          if (method.ownerName) detailSegments.push(method.ownerName);
          if (method.issuer) detailSegments.push(method.issuer);
          if (method.lastFour) detailSegments.push(`끝 ${method.lastFour}`);
          if (method.linkedAccountName) {
            detailSegments.push(method.linkedAccountName);
          } else {
            detailSegments.push("연결 계좌 없음");
          }
          const detailText = detailSegments.join(" · ");

          const balanceLabel = hasBalance ? "보조잔액" : "자체 잔액 없음";
          const balanceText = hasBalance
            ? method.balance === null
              ? "-"
              : formatCurrency(method.balance)
            : null;

          return (
            <article
              key={method.id}
              className="border-b last:border-b-0 transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <Link
                href={`/ledger/payment-methods/${method.id}`}
                className="group flex flex-col gap-1 px-4 py-3 sm:px-5"
              >
                {/* Top Row: type label on left, chevron on right */}
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>{typeLabel}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
                </div>

                {/* Title/Name Row */}
                <div className="mt-0.5">
                  <h4 className="line-clamp-2 min-w-0 break-words font-semibold text-gray-900 text-sm leading-5">
                    {method.name}
                  </h4>
                </div>

                {/* Detail Row: text-only */}
                <div className="mt-1 text-xs text-gray-500 break-words">
                  {detailText}
                </div>

                {/* Bottom Row: balance info */}
                <div className="mt-1 flex items-end justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{balanceLabel}</span>
                  {balanceText !== null && (
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap text-right ml-auto">
                      {balanceText}
                    </span>
                  )}
                </div>
              </Link>
            </article>
          );
        })}
      </GroupedList>
    </ScreenSection>
  );
}
