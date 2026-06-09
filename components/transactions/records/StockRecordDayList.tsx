"use client";

import { CalendarDays, User, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCompactCurrency, formatDate } from "@/lib/utils/format";

interface StockRecordDayListProps {
  selectedDate: string;
  transactions: TransactionWithDetails[];
}

export function StockRecordDayList({
  selectedDate,
  transactions,
}: StockRecordDayListProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between gap-3 bg-gray-50/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-gray-400" />
          <h3 className="truncate font-semibold text-gray-900 text-sm">
            {formatDate(selectedDate)}
          </h3>
        </div>
        <Badge variant="outline">{transactions.length}건</Badge>
      </div>

      {transactions.length > 0 ? (
        <div>
          {transactions.map((transaction) => {
            const isBuy = transaction.type === "buy";
            const typeLabel = isBuy ? "매수" : "매도";

            return (
              <article
                key={transaction.id}
                className="border-gray-100 border-t first:border-t-0"
              >
                <Link
                  href={`/assets/stock/transactions/${transaction.id}?from=records&date=${selectedDate}`}
                  className="flex min-h-[72px] flex-col justify-center px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-5"
                >
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Badge
                        variant={isBuy ? "default" : "secondary"}
                        className="shrink-0 px-1.5 py-0 text-[10px]"
                      >
                        {typeLabel}
                      </Badge>
                      <span className="line-clamp-2 min-w-0 text-left font-semibold text-gray-900 text-sm leading-5 break-words">
                        {transaction.stockName}
                      </span>
                    </div>
                    <div className="max-w-full self-end text-right font-medium text-gray-900 text-sm leading-tight [overflow-wrap:anywhere] sm:shrink-0">
                      {formatCompactCurrency(
                        transaction.price * transaction.quantity,
                        transaction.currency,
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs">
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
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="font-medium text-gray-700">
            선택한 날짜의 거래가 없습니다.
          </p>
          <p className="mt-1 text-gray-400 text-sm">
            날짜를 바꾸거나 새 거래를 추가해보세요.
          </p>
        </div>
      )}
    </section>
  );
}
