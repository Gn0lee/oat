"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getLedgerMoneySourceLabel } from "@/components/ledger/LedgerMoneySourceCombobox";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type {
  LedgerComposerItem,
  LedgerComposerValues,
} from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";
import { ComposerMemoField } from "./EntryFields";

interface EntryReviewStepProps {
  onEdit: (
    clientId: string,
    step: "basics" | "classification" | "sources" | "datesBooks",
  ) => void;
  onAdd: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function getTypeLabel(type: LedgerComposerItem["type"]) {
  return type === "income"
    ? "수입"
    : type === "transfer"
      ? "이체"
      : type === "non_expense_withdrawal"
        ? "비지출 출금"
        : "지출";
}

export function EntryReviewStep({
  onEdit,
  onAdd,
  onSave,
  isSaving,
}: EntryReviewStepProps) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const { data: books = [] } = useLedgerBooks();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { userId } = useCurrentUserId();
  const [openMemoIds, setOpenMemoIds] = useState<Set<string>>(() => new Set());
  return (
    <section className="space-y-4 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">저장 전 확인</h1>
      {items.map((item, index) => {
        const book = books.find((candidate) => candidate.id === item.bookId);
        const categories =
          item.type === "income" ? incomeCategories : expenseCategories;
        const category = categories.find(
          (candidate) => candidate.id === item.categoryId,
        );
        const parent = category?.parent_id
          ? categories.find((candidate) => candidate.id === category.parent_id)
          : undefined;
        const categoryLabel = parent
          ? `${parent.name} > ${category?.name}`
          : category?.name;
        const shared = book?.visibility === "shared";
        const sourceValue = item.paymentMethodId
          ? `pm:${item.paymentMethodId}`
          : item.accountId
            ? `acc:${item.accountId}`
            : "";
        const sourceMode = item.type === "income" ? "income" : "expense";
        const sourcePlaceholder =
          item.type === "non_expense_withdrawal"
            ? "출금처 미선택"
            : "선택 안함";
        const sourceLabel =
          item.type === "transfer"
            ? `${getLedgerMoneySourceLabel({ mode: "transfer", value: item.fromValue ?? "", paymentMethods, accounts, ownerId: userId, isShared: shared, placeholder: "출발지 미선택" })} → ${getLedgerMoneySourceLabel({ mode: "transfer", value: item.toValue ?? "", paymentMethods, accounts, ownerId: userId, isShared: shared, placeholder: "도착지 미선택" })}`
            : getLedgerMoneySourceLabel({
                mode: sourceMode,
                value: sourceValue,
                paymentMethods,
                accounts,
                ownerId: userId,
                isShared: shared,
                placeholder: sourcePlaceholder,
              });
        const isMemoOpen = openMemoIds.has(item.clientId);
        return (
          <article
            key={item.clientId}
            className="space-y-3 border-b border-gray-200 pb-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {getTypeLabel(item.type)} · {book?.name ?? "장부 미선택"} ·{" "}
                  {book?.visibility === "personal" ? "개인" : "공용"} ·{" "}
                  {item.transactedAt}
                </p>
                <p className="break-words font-medium">
                  {item.title || "내용 입력"}
                </p>
                <p className="text-lg font-semibold">
                  {item.amount
                    ? `${Number(item.amount).toLocaleString()}원`
                    : "금액 입력"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                onClick={() => onEdit(item.clientId, "basics")}
              >
                내용 수정
              </Button>
            </div>
            <div className="flex flex-col items-start gap-1">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                onClick={() => onEdit(item.clientId, "classification")}
              >
                {item.type === "expense" || item.type === "income"
                  ? `분류: ${categoryLabel ?? "선택 필요"} · 수정`
                  : `유형: ${getTypeLabel(item.type)} · 수정`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                onClick={() => onEdit(item.clientId, "sources")}
              >
                {item.type === "transfer"
                  ? `금융수단: ${sourceLabel} · 수정`
                  : `${item.type === "income" ? "입금 위치" : item.type === "non_expense_withdrawal" ? "출금처" : "결제 방법"}: ${sourceLabel} · 수정`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                onClick={() => onEdit(item.clientId, "datesBooks")}
              >
                날짜·장부 수정
              </Button>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                aria-label={`메모 ${index + 1} ${isMemoOpen ? "접기" : "편집"}`}
                aria-expanded={isMemoOpen}
                onClick={() =>
                  setOpenMemoIds((current) => {
                    const next = new Set(current);
                    if (next.has(item.clientId)) next.delete(item.clientId);
                    else next.add(item.clientId);
                    return next;
                  })
                }
              >
                {item.memo ? "메모 편집" : "메모 추가"}
              </Button>
              {!isMemoOpen && item.memo?.trim() && (
                <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                  {item.memo}
                </p>
              )}
              {isMemoOpen && <ComposerMemoField index={index} />}
            </div>
          </article>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        onClick={onAdd}
      >
        내역 추가
      </Button>
      <ComposerActionBar
        label={isSaving ? "저장 중..." : "모두 저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
