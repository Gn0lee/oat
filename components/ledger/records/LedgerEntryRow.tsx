"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AmountText } from "@/components/layout/screen";
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

  const typeLabel = isTransfer
    ? "내부이체"
    : isNonExpenseWithdrawal
      ? "비지출 출금"
      : isIncome
        ? "수입"
        : "지출";

  const paymentLabel =
    entry.fromPaymentMethodName ?? entry.fromAccountName ?? entry.toAccountName;

  const transferLabel = isTransfer
    ? `${entry.fromAccountName ?? entry.fromPaymentMethodName ?? "출발지"} → ${
        entry.toAccountName ?? entry.toPaymentMethodName ?? "도착지"
      }`
    : null;

  const categoryLabel = isNonExpenseWithdrawal
    ? "비지출 출금"
    : entry.categoryName;

  const titleText =
    entry.title ??
    (isNonExpenseWithdrawal
      ? "비지출 출금"
      : (entry.categoryName ?? (isTransfer ? "내부이체" : "미분류")));

  const contextSegments: string[] = [];
  if (isTransfer) {
    if (transferLabel) contextSegments.push(transferLabel);
  } else {
    if (categoryLabel) contextSegments.push(categoryLabel);
  }
  if (entry.ownerName) {
    contextSegments.push(entry.ownerName);
  }
  if (!isTransfer && paymentLabel) {
    contextSegments.push(paymentLabel);
  }
  const contextText = contextSegments.join(" · ");

  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100 sm:px-5"
    >
      {/* Top Row: status + share indicator on left, chevron on right */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>
          {typeLabel} · {entry.isShared ? "공용" : "개인"}
        </span>
        <ChevronRight
          data-testid="ledger-entry-row-chevron"
          className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
        />
      </div>

      {/* Title Row */}
      <div className="mt-0.5">
        <span className="line-clamp-2 min-w-0 break-words text-sm leading-5 font-semibold text-gray-900">
          {titleText}
        </span>
      </div>

      {/* Tag Row: max 5 tags, wrapping, no +N */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {entry.tags.slice(0, 5).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Row: context text on left, amount on right */}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className="break-words max-w-full">{contextText}</span>
        <AmountText
          amount={entry.amount}
          sign={amountSign}
          tone={isTransfer ? "neutral" : isIncome ? "income" : "expense"}
          title={`${amountSign}${formatCurrency(entry.amount)}`}
          className="text-sm font-semibold whitespace-nowrap text-right ml-auto"
        />
      </div>
    </Link>
  );
}
