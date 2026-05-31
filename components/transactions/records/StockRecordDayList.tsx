"use client";

import {
  CalendarDays,
  MoreVertical,
  Pencil,
  Trash2,
  User,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { cn } from "@/lib/utils/cn";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "@/lib/utils/format";

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
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deleteTransaction, setDeleteTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
                  className="group relative flex min-h-[72px] flex-col justify-center border-gray-100 border-t px-4 py-3.5 first:border-t-0 sm:px-5"
                >
                  <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditTransaction(transaction);
                              setIsEditOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 size-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTransaction(transaction);
                              setIsDeleteOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-1 pr-6">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Badge
                          variant={isBuy ? "default" : "secondary"}
                          className="shrink-0 px-1.5 py-0 text-[10px]"
                        >
                          {typeLabel}
                        </Badge>
                        <Popover>
                          <PopoverTrigger className="cursor-pointer truncate text-left font-semibold text-gray-900 text-sm transition-colors hover:text-gray-600">
                            {transaction.stockName}
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-3 text-sm shadow-md"
                            align="start"
                          >
                            <div className="mb-1 font-semibold text-gray-900">
                              {transaction.stockName}
                            </div>
                            <div className="text-gray-500">
                              총 거래금액:{" "}
                              <span className="font-medium text-gray-900">
                                {formatCurrency(
                                  transaction.price * transaction.quantity,
                                  transaction.currency,
                                )}
                              </span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="shrink-0 font-medium text-gray-900 text-sm">
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
                        <span className="truncate">
                          {transaction.owner.name}
                        </span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Wallet className="size-3 shrink-0" />
                        <span className="truncate">
                          {transaction.accountName ?? "계좌 없음"}
                        </span>
                      </span>
                    </div>
                  </div>
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
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <TransactionDeleteDialog
        transaction={deleteTransaction}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
