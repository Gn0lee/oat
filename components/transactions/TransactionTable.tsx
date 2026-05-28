"use client";

import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { formatCurrency, formatDate, formatDateISO } from "@/lib/utils/format";
import { TransactionDeleteDialog } from "./TransactionDeleteDialog";
import { TransactionEditDialog } from "./TransactionEditDialog";

interface TransactionTableProps {
  data: TransactionWithDetails[];
  currentUserId: string;
}

interface TransactionDateGroup {
  dateKey: string;
  label: string;
  transactions: TransactionWithDetails[];
}

function groupTransactionsByDate(
  transactions: TransactionWithDetails[],
): TransactionDateGroup[] {
  const groups = new Map<string, TransactionWithDetails[]>();

  for (const transaction of transactions) {
    const dateKey = formatDateISO(transaction.transactedAt);
    const group = groups.get(dateKey) ?? [];
    group.push(transaction);
    groups.set(dateKey, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, group]) => ({
      dateKey,
      label: formatDate(dateKey),
      transactions: group.sort(
        (a, b) =>
          new Date(b.transactedAt).getTime() -
          new Date(a.transactedAt).getTime(),
      ),
    }));
}

function TransactionItem({
  transaction,
  currentUserId,
  onEdit,
  onDelete,
}: {
  transaction: TransactionWithDetails;
  currentUserId: string;
  onEdit: (transaction: TransactionWithDetails) => void;
  onDelete: (transaction: TransactionWithDetails) => void;
}) {
  const isBuy = transaction.type === "buy";
  const isOwner = transaction.owner.id === currentUserId;
  const typeLabel = isBuy ? "매수" : "매도";

  return (
    <article className="group flex min-h-[96px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0 sm:px-5">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          isBuy ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500",
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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-gray-900">
            {transaction.stockName}
          </p>
          <Badge variant={isBuy ? "default" : "secondary"}>{typeLabel}</Badge>
          <span className="text-gray-400 text-xs">{transaction.ticker}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-gray-500 text-xs">
          <span>{transaction.quantity.toLocaleString()}주</span>
          <span>{formatCurrency(transaction.price, transaction.currency)}</span>
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3" />
            {transaction.owner.name}
          </span>
          {transaction.memo && (
            <span className="max-w-full truncate text-gray-400">
              {transaction.memo}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <p className="min-w-[92px] text-right font-semibold text-gray-900 tabular-nums">
          {formatCurrency(transaction.totalAmount, transaction.currency)}
        </p>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                <Pencil className="mr-2 size-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </article>
  );
}

export function TransactionTable({
  data,
  currentUserId,
}: TransactionTableProps) {
  const [editTransaction, setEditTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [deleteTransaction, setDeleteTransaction] =
    useState<TransactionWithDetails | null>(null);

  const groups = useMemo(() => groupTransactionsByDate(data), [data]);

  return (
    <>
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.dateKey}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-center justify-between gap-3 bg-gray-50/70 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-gray-400" />
                  <h3 className="truncate font-semibold text-gray-900 text-sm">
                    {group.label}
                  </h3>
                </div>
                <Badge variant="outline">{group.transactions.length}건</Badge>
              </div>
              <div>
                {group.transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    currentUserId={currentUserId}
                    onEdit={setEditTransaction}
                    onDelete={setDeleteTransaction}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100">
          <CalendarDays className="mx-auto mb-3 size-8 text-gray-300" />
          <p className="font-medium text-gray-700">거래 내역이 없습니다.</p>
          <p className="mt-1 text-gray-400 text-sm">
            필터를 바꾸거나 새 거래를 추가해보세요.
          </p>
        </div>
      )}

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
