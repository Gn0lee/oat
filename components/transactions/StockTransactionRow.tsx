"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AmountText } from "@/components/layout/screen";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency } from "@/lib/utils/format";

interface StockTransactionRowProps {
  href: string;
  transaction: TransactionWithDetails;
}

export function StockTransactionRow({
  href,
  transaction,
}: StockTransactionRowProps) {
  const isBuy = transaction.type === "buy";
  const typeLabel = isBuy ? "매수" : "매도";

  const detailText = `${transaction.quantity.toLocaleString()}주 x ${formatCurrency(
    transaction.price,
    transaction.currency,
  )} · ${transaction.owner.name} · ${transaction.accountName ?? "계좌 없음"}`;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100 sm:px-5"
    >
      {/* Top Row: type label on left, chevron on right */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>{typeLabel}</span>
        <ChevronRight
          data-testid="stock-transaction-row-chevron"
          className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
        />
      </div>

      {/* Title Row */}
      <div className="mt-0.5">
        <span className="line-clamp-2 min-w-0 break-words text-sm leading-5 font-semibold text-gray-900">
          {transaction.stockName}
        </span>
      </div>

      {/* Detail Row: text-only */}
      <div className="mt-1 text-xs text-gray-500 break-words">{detailText}</div>

      {/* Bottom Row: amount on the right */}
      <div className="mt-1 flex justify-end">
        <AmountText
          amount={transaction.price * transaction.quantity}
          currency={transaction.currency}
          title={formatCurrency(
            transaction.price * transaction.quantity,
            transaction.currency,
          )}
          tone="neutral"
          className="text-sm font-semibold whitespace-nowrap text-right ml-auto"
        />
      </div>
    </Link>
  );
}
