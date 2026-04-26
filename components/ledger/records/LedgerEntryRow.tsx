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
  onEdit: (entry: LedgerEntryWithDetails) => void;
  onDelete: (entry: LedgerEntryWithDetails) => void;
}

export function LedgerEntryRow({
  entry,
  onEdit,
  onDelete,
}: LedgerEntryRowProps) {
  const isIncome = entry.type === "income";
  const amountSign = isIncome ? "+" : "-";
  const amountColor = isIncome ? "text-red-500" : "text-gray-900";

  const paymentLabel =
    entry.fromPaymentMethodName ?? entry.fromAccountName ?? entry.toAccountName;

  const metaParts = [entry.categoryName, entry.ownerName, paymentLabel].filter(
    Boolean,
  );

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      {/* 카테고리 아이콘 */}
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <CategoryIcon
          iconName={entry.categoryIcon}
          className="w-5 h-5 text-gray-600"
        />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {entry.title ?? entry.categoryName ?? "미분류"}
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

      {/* 금액 + 메뉴 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`text-sm font-semibold ${amountColor}`}>
          {amountSign}
          {formatCurrency(entry.amount)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entry)}>
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(entry)}
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
