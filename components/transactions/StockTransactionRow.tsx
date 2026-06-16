"use client";

import { ChevronRight, User, Wallet } from "lucide-react";
import Link from "next/link";
import { AmountText } from "@/components/layout/screen";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "../ui/badge";

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

  return (
    <Link
      href={href}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100 sm:px-5"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          <Badge
            variant={isBuy ? "default" : "secondary"}
            className="shrink-0 px-1.5 py-0 text-[10px]"
          >
            {typeLabel}
          </Badge>
          <span className="line-clamp-2 min-w-0 break-words text-left text-sm leading-5 font-semibold text-gray-900">
            {transaction.stockName}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{transaction.quantity.toLocaleString()}주</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <User className="size-3 shrink-0" />
            <span className="truncate">{transaction.owner.name}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Wallet className="size-3 shrink-0" />
            <span className="truncate">
              {transaction.accountName ?? "계좌 없음"}
            </span>
          </span>
        </div>
      </div>
      <div className="flex min-w-[7rem] max-w-[42vw] shrink-0 items-center justify-end gap-1.5 text-right">
        <AmountText
          amount={transaction.price * transaction.quantity}
          currency={transaction.currency}
          title={formatCurrency(
            transaction.price * transaction.quantity,
            transaction.currency,
          )}
          tone="neutral"
          className="text-sm font-medium whitespace-nowrap"
        />
        <ChevronRight
          data-testid="stock-transaction-row-chevron"
          className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
        />
      </div>
    </Link>
  );
}
