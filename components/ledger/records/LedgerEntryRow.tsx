"use client";

import { UserIcon } from "lucide-react";
import Link from "next/link";
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
  const amountSign = isTransfer ? "" : isIncome ? "+" : "-";
  const amountColor = isTransfer
    ? "text-gray-900"
    : isIncome
      ? "text-red-500"
      : "text-blue-500";

  const paymentLabel =
    entry.fromPaymentMethodName ?? entry.fromAccountName ?? entry.toAccountName;
  const transferLabel = isTransfer
    ? `${entry.fromAccountName ?? entry.fromPaymentMethodName ?? "출발지"} → ${
        entry.toAccountName ?? entry.toPaymentMethodName ?? "도착지"
      }`
    : null;
  const iconName = isTransfer ? "ArrowLeftRight" : entry.categoryIcon;

  const metaParts = [
    entry.categoryName,
    transferLabel,
    entry.ownerName,
    paymentLabel,
  ].filter(Boolean);

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 border-b py-3 transition-colors last:border-b-0 hover:bg-gray-50"
    >
      {/* 카테고리 아이콘 */}
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <CategoryIcon iconName={iconName} className="w-5 h-5 text-gray-600" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <span className="line-clamp-2 min-w-0 font-semibold text-gray-900 text-sm leading-5 break-words">
            {entry.title ??
              entry.categoryName ??
              (isTransfer ? "이체" : "미분류")}
          </span>
          {!entry.isShared && (
            <UserIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
        </div>
        {metaParts.length > 0 && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {metaParts.join(" · ")}
          </p>
        )}
      </div>

      {/* 금액 */}
      <div className="max-w-[42%] flex-shrink-0 text-right">
        <span
          className={`text-sm font-semibold leading-tight [overflow-wrap:anywhere] ${amountColor}`}
        >
          {amountSign}
          {formatCurrency(entry.amount)}
        </span>
      </div>
    </Link>
  );
}
