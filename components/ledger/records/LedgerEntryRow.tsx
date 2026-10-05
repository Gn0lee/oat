"use client";

import Link from "next/link";
import { AmountText } from "@/components/layout/screen";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryRowProps {
  entry: LedgerEntryWithDetails;
  href: string;
  /** 검색 결과처럼 날짜 묶음 밖에서 보여줄 때의 거래일 */
  dateLabel?: string;
  memoContext?: string;
  /** 전체 장부 범위에서만 장부 이름을 보여준다 */
  showBook?: boolean;
  /** 내 기록이면 작성자 이름을 생략한다 */
  currentUserId?: string | null;
  onClick?: () => void;
}

export function LedgerEntryRow({
  entry,
  href,
  dateLabel,
  memoContext,
  showBook = false,
  currentUserId,
  onClick,
}: LedgerEntryRowProps) {
  const isIncome = entry.type === "income";
  const isTransfer = entry.type === "transfer";
  const isNonExpenseWithdrawal = entry.type === "non_expense_withdrawal";
  const sign = isTransfer ? "" : isIncome ? "+" : "-";
  const amountLabel = `${sign}${formatCurrency(entry.amount)}`;

  const titleText =
    entry.title ??
    (isNonExpenseWithdrawal
      ? "비지출 출금"
      : isTransfer
        ? "내부이체"
        : (entry.categoryName ?? "미분류"));
  const sourceText = isTransfer
    ? `${entry.fromAccountName ?? entry.fromPaymentMethodName ?? "출발지"} → ${
        entry.toAccountName ?? entry.toPaymentMethodName ?? "도착지"
      }`
    : (entry.fromPaymentMethodName ??
      entry.fromAccountName ??
      entry.toAccountName ??
      entry.toPaymentMethodName);
  const primaryLine = sourceText ? `${titleText} | ${sourceText}` : titleText;

  const isPersonal = entry.book
    ? entry.book.visibility === "personal"
    : !entry.isShared;
  const metaSegments = [
    isNonExpenseWithdrawal
      ? "비지출 출금"
      : entry.title && !isTransfer
        ? entry.categoryName
        : null,
    showBook ? entry.book?.name : null,
    isPersonal ? "개인" : null,
    entry.book?.archivedAt ? "보관" : null,
    entry.ownerName && entry.ownerId !== currentUserId ? entry.ownerName : null,
    dateLabel,
  ].filter((segment): segment is string => Boolean(segment));

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-16 items-start gap-3 py-3 transition-colors active:bg-gray-50"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
      >
        <CategoryIcon iconName={entry.categoryIcon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <AmountText
          value={amountLabel}
          tone="neutral"
          align="left"
          title={amountLabel}
          className={cn(
            "block text-base font-bold",
            isIncome && "text-red-600",
          )}
        />
        <span className="mt-0.5 block truncate text-sm text-gray-600">
          {primaryLine}
        </span>
        {metaSegments.length > 0 && (
          <span className="mt-0.5 block truncate text-xs text-gray-500">
            {metaSegments.join(" · ")}
          </span>
        )}
        {memoContext && (
          <span className="mt-0.5 line-clamp-1 block break-words text-xs text-gray-500">
            {memoContext}
          </span>
        )}
      </span>
    </Link>
  );
}
