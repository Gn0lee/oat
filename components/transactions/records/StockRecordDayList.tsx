"use client";

import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { TransactionDeleteDialog } from "@/components/transactions/TransactionDeleteDialog";
import { TransactionEditDialog } from "@/components/transactions/TransactionEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface StockRecordDayListProps {
  selectedDate: string;
  transactions: TransactionWithDetails[];
  currentUserId: string;
}

export function StockRecordDayList({
  selectedDate,
  transactions,
  currentUserId,
}: StockRecordDayListProps) {
  const [editTransaction, setEditTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [deleteTransaction, setDeleteTransaction] =
    useState<TransactionWithDetails | null>(null);

  return (
    <>
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
              const isOwner = transaction.owner.id === currentUserId;
              const typeLabel = isBuy ? "매수" : "매도";

              return (
                <article
                  key={transaction.id}
                  className="flex min-h-[92px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0 sm:px-5"
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      isBuy
                        ? "bg-red-50 text-red-500"
                        : "bg-blue-50 text-blue-500",
                    )}
                    aria-hidden="true"
                  >
                    {isBuy ? (
                      <TrendingUp className="size-5" />
                    ) : (
                      <TrendingDown className="size-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">
                        {transaction.stockName}
                      </p>
                      <Badge
                        variant={isBuy ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {typeLabel}
                      </Badge>
                      <span className="shrink-0 text-gray-400 text-xs">
                        {transaction.ticker}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-gray-500 text-xs">
                      <span>{transaction.quantity.toLocaleString()}주</span>
                      <span>
                        {formatCurrency(
                          transaction.price,
                          transaction.currency,
                        )}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Wallet className="size-3 shrink-0" />
                        <span className="truncate">
                          {transaction.accountName ?? "계좌 없음"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">메뉴 열기</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditTransaction(transaction)}
                        >
                          <Pencil className="mr-2 size-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTransaction(transaction)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

      <TransactionEditDialog
        transaction={editTransaction}
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      />
      <TransactionDeleteDialog
        transaction={deleteTransaction}
        open={!!deleteTransaction}
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
      />
    </>
  );
}
