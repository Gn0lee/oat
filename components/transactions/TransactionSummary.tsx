"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils/format";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";

interface TransactionSummaryProps {
  items: TransactionItemFormData[];
  type: "buy" | "sell";
}

export function TransactionSummary({ items, type }: TransactionSummaryProps) {
  const { validCount, totals } = useMemo(() => {
    let count = 0;
    const sums = { KRW: 0, USD: 0 };

    for (const item of items) {
      if (!item.stock || !item.quantity) continue;
      const qty = Number(item.quantity);
      if (qty <= 0) continue;

      count++;
      const prc = Number(item.price) || 0;
      const amount = qty * prc;
      const currency = item.stock.market === "US" ? "USD" : "KRW";
      sums[currency] += amount;
    }

    return { validCount: count, totals: sums };
  }, [items]);

  const typeText = type === "buy" ? "매수" : "매도";

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-500">등록할 거래</span>
        <span className="font-medium text-gray-900">{validCount}건</span>
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

      {validCount === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          종목을 선택하고 수량을 입력해주세요
        </p>
      )}
    </div>
  );
}
