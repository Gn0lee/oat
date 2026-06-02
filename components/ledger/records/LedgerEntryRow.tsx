"use client";

import { MoreVertical, UserIcon } from "lucide-react";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryRowProps {
  entry: LedgerEntryWithDetails;
  currentUserId?: string | null;
  onEdit: (entry: LedgerEntryWithDetails) => void;
  onDelete: (entry: LedgerEntryWithDetails) => void;
  onRequestUpdate?: (entry: LedgerEntryWithDetails) => void;
  onRequestDelete?: (entry: LedgerEntryWithDetails) => void;
}

export function LedgerEntryRow({
  entry,
  currentUserId,
  onEdit,
  onDelete,
  onRequestUpdate,
  onRequestDelete,
}: LedgerEntryRowProps) {
  const isIncome = entry.type === "income";
  const isTransfer = entry.type === "transfer";
  const isOwner = Boolean(currentUserId && entry.ownerId === currentUserId);
  const canUpdate = !isTransfer;
  const canRequest = Boolean(currentUserId && !isOwner && entry.isShared);
  const hasActions = isOwner || canRequest;
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

  const metaParts = [
    entry.categoryName,
    transferLabel,
    entry.ownerName,
    paymentLabel,
  ].filter(Boolean);

  return (
    <div className="group relative flex items-center gap-3 py-3 border-b last:border-b-0 pr-10">
      {hasActions && (
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="기록 작업"
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner ? (
                <>
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => onEdit(entry)}>
                      수정
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(entry)}
                  >
                    삭제
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {canUpdate && (
                    <DropdownMenuItem onClick={() => onRequestUpdate?.(entry)}>
                      수정 요청
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRequestDelete?.(entry)}
                  >
                    삭제 요청
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 카테고리 아이콘 */}
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <CategoryIcon
          iconName={entry.categoryIcon}
          className="w-5 h-5 text-gray-600"
        />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <span className="font-semibold text-gray-900 text-sm truncate">
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
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`text-sm font-semibold ${amountColor}`}>
          {amountSign}
          {formatCurrency(entry.amount)}
        </span>
      </div>
    </div>
  );
}
