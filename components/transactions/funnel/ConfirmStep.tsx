"use client";

import { ArrowLeftIcon, CalendarIcon, WalletIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { AccountWithOwner } from "@/lib/api/account";
import { formatCurrency } from "@/lib/utils/format";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";

interface ConfirmStepProps {
  context: {
    type: "buy" | "sell";
    transactedAt: string;
    accountId?: string;
    items: TransactionItemFormData[];
  };
  accounts: AccountWithOwner[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ConfirmStep({
  context,
  accounts,
  onSubmit,
  onBack,
  isSubmitting,
}: ConfirmStepProps) {
  const typeText = context.type === "buy" ? "매수" : "매도";
  const typeColor = context.type === "buy" ? "text-red-600" : "text-blue-600";
  const typeBgColor = context.type === "buy" ? "bg-red-50" : "bg-blue-50";

  const validItems = context.items.filter(
    (item) => item.stock && item.quantity && Number(item.quantity) > 0,
  );

  const accountName = useMemo(() => {
    if (!context.accountId || context.accountId === "__none__") {
      return "계좌 없음";
    }
    const account = accounts.find((a) => a.id === context.accountId);
    return account ? account.name : "알 수 없는 계좌";
  }, [context.accountId, accounts]);

  const totals = useMemo(() => {
    const sums = { KRW: 0, USD: 0 };
    for (const item of validItems) {
      if (!item.stock) continue;
      const qty = Number(item.quantity) || 0;
      const prc = Number(item.price) || 0;
      const currency = item.stock.market === "US" ? "USD" : "KRW";
      sums[currency] += qty * prc;
    }
    return sums;
  }, [validItems]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <span className={`text-sm font-medium ${typeColor}`}>{typeText}</span>
          <h2 className="text-xl font-bold text-gray-900">최종 확인</h2>
        </div>
      </div>

      {/* 거래 요약 */}
      <div className={`rounded-2xl p-5 space-y-3 ${typeBgColor}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarIcon className="w-4 h-4" />
          <span className="text-sm">{formatDate(context.transactedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <WalletIcon className="w-4 h-4" />
          <span className="text-sm">{accountName}</span>
        </div>
      </div>

      {/* 종목 목록 */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        {validItems.map((item) => {
          const qty = Number(item.quantity) || 0;
          const prc = Number(item.price) || 0;
          const subtotal = qty * prc;
          const currency = item.stock!.market === "US" ? "USD" : "KRW";

          return (
            <div
              key={item.stock!.code}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{item.stock!.name}</p>
                <p className="text-sm text-gray-500">
                  {qty.toLocaleString()}주 × {formatCurrency(prc, currency)}
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(subtotal, currency)}
              </p>
            </div>
          );
        })}
      </div>

      {/* 총액 */}
      <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">총 {typeText} 건수</span>
          <span className="font-bold text-gray-900">{validItems.length}건</span>
        </div>
        {totals.KRW > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">총 {typeText}금액 (KRW)</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(totals.KRW, "KRW")}
            </span>
          </div>
        )}
        {totals.USD > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">총 {typeText}금액 (USD)</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(totals.USD, "USD")}
            </span>
          </div>
        )}
      </div>

      {/* 등록 버튼 */}
      <Button
        onClick={onSubmit}
        disabled={isSubmitting || validItems.length === 0}
        className="w-full h-14 rounded-xl text-base font-semibold"
      >
        {isSubmitting
          ? "등록 중..."
          : `${typeText} ${validItems.length}건 등록하기`}
      </Button>
    </div>
  );
}
