"use client";

import { User, Wallet } from "lucide-react";
import Link from "next/link";
import {
  AmountText,
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface StockRecordDayListProps {
  selectedDate: string;
  transactions: TransactionWithDetails[];
}

export function StockRecordDayList({
  selectedDate,
  transactions,
}: StockRecordDayListProps) {
  return (
    <ScreenSection>
      <SectionHeader
        title={formatDate(selectedDate)}
        action={
          transactions.length > 0 ? (
            <Badge variant="secondary" className="font-medium">
              {transactions.length}건
            </Badge>
          ) : null
        }
      />

      {transactions.length > 0 ? (
        <GroupedList>
          {transactions.map((transaction) => {
            const isBuy = transaction.type === "buy";
            const typeLabel = isBuy ? "매수" : "매도";

            return (
              <Link
                key={transaction.id}
                href={`/assets/stock/transactions/${transaction.id}?from=records&date=${selectedDate}`}
                className="group flex flex-col justify-center border-b py-3.5 transition-colors last:border-b-0 hover:bg-gray-50"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                  <div className="flex min-w-0 items-start gap-2">
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
                  <div className="shrink-0 text-right max-w-[42%]">
                    <AmountText
                      amount={transaction.price * transaction.quantity}
                      currency={transaction.currency}
                      title={formatCurrency(
                        transaction.price * transaction.quantity,
                        transaction.currency,
                      )}
                      tone="neutral"
                      className="text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs mt-1">
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
            );
          })}
        </GroupedList>
      ) : (
        <ScreenState
          type="empty"
          title="선택한 날짜의 거래가 없습니다."
          description="날짜를 바꾸거나 새 거래를 추가해보세요."
        />
      )}
    </ScreenSection>
  );
}
