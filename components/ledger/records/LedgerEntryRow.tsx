"use client";

import {
  ArrowLeftRight,
  ChevronRight,
  Tag,
  UserIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AmountText } from "@/components/layout/screen";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryRowProps {
  entry: LedgerEntryWithDetails;
  href: string;
}

export function LedgerEntryRow({ entry, href }: LedgerEntryRowProps) {
  const isIncome = entry.type === "income";
  const isTransfer = entry.type === "transfer";
  const isNonExpenseWithdrawal = entry.type === "non_expense_withdrawal";
  const amountSign = isTransfer ? "" : isIncome ? "+" : "-";

  const paymentLabel =
    entry.fromPaymentMethodName ?? entry.fromAccountName ?? entry.toAccountName;
  const transferLabel = isTransfer
    ? `${entry.fromAccountName ?? entry.fromPaymentMethodName ?? "출발지"} → ${
        entry.toAccountName ?? entry.toPaymentMethodName ?? "도착지"
      }`
    : null;
  const iconName = isTransfer
    ? "ArrowLeftRight"
    : isNonExpenseWithdrawal
      ? "ArrowUpRight"
      : entry.categoryIcon;
  const categoryLabel = isNonExpenseWithdrawal
    ? "비지출 출금"
    : entry.categoryName;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100 sm:px-5"
    >
      {/* 카테고리 아이콘 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
        <CategoryIcon iconName={iconName} className="w-4 h-4 text-gray-600" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <span className="line-clamp-2 min-w-0 break-words text-sm leading-5 font-semibold text-gray-900">
          {entry.title ??
            (isNonExpenseWithdrawal
              ? "비지출 출금"
              : (entry.categoryName ?? (isTransfer ? "내부이체" : "미분류")))}
        </span>
        {(categoryLabel ||
          transferLabel ||
          entry.ownerName ||
          paymentLabel) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {categoryLabel && !isTransfer && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Tag className="size-3 shrink-0" />
                <span className="truncate">{categoryLabel}</span>
              </span>
            )}
            {transferLabel && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <ArrowLeftRight className="size-3 shrink-0" />
                <span className="truncate">{transferLabel}</span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserIcon className="size-3 shrink-0" />
              <span className="truncate">{entry.ownerName}</span>
            </span>
            {paymentLabel && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Wallet className="size-3 shrink-0" />
                <span className="truncate">{paymentLabel}</span>
              </span>
            )}
          </div>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
              >
                #{tag.name}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-100">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex max-w-[42%] flex-shrink-0 items-center gap-1.5 text-right">
        <AmountText
          amount={entry.amount}
          sign={amountSign}
          tone={isTransfer ? "neutral" : isIncome ? "income" : "expense"}
          title={`${amountSign}${formatCurrency(entry.amount)}`}
          className="text-sm whitespace-nowrap"
        />
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
      </div>
    </Link>
  );
}
