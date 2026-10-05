"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
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
import { ComposerMemoField } from "./ComposerMemoField";

interface EntryReviewStepProps {
  onEdit: (
    clientId: string,
    step: "basics" | "classification" | "sources" | "datesBooks",
    anchorId: string,
  ) => void;
  focusId?: string;
  onFocusRestored?: () => void;
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
  focusId,
  onFocusRestored,
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
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    onFocusRestored?.();
  }, [focusId, onFocusRestored]);
  return (
    <section className="space-y-4 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">입력 확인</h1>
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
            className="space-y-3 border-b border-border pb-4"
          >
            <div className="min-w-0 space-y-1">
              <button
                type="button"
                className="block min-h-11 max-w-full break-words text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id={`review-${item.clientId}-title`}
                aria-label={`기록 ${index + 1} 내용 수정: ${item.title || "내용 입력"}`}
                onClick={() =>
                  onEdit(
                    item.clientId,
                    "basics",
                    `review-${item.clientId}-title`,
                  )
                }
              >
                {item.title || "내용 입력"}
              </button>
              <button
                type="button"
                className="block min-h-11 text-left text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id={`review-${item.clientId}-amount`}
                aria-label={`기록 ${index + 1} 금액 수정: ${item.amount ? `${Number(item.amount).toLocaleString()}원` : "금액 입력"}`}
                onClick={() =>
                  onEdit(
                    item.clientId,
                    "basics",
                    `review-${item.clientId}-amount`,
                  )
                }
              >
                {item.amount
                  ? `${Number(item.amount).toLocaleString()}원`
                  : "금액 입력"}
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <p>{getTypeLabel(item.type)}</p>
              <p className="break-words">
                {book?.name ?? "장부 미선택"} ·{" "}
                {book?.visibility === "personal" ? "개인 장부" : "공용 장부"}
              </p>
              <p>{item.transactedAt}</p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-0 py-2 text-left"
                id={`review-${item.clientId}-classification`}
                aria-label={`기록 ${index + 1} 분류 수정: ${categoryLabel ?? getTypeLabel(item.type)}`}
                onClick={() =>
                  onEdit(
                    item.clientId,
                    "classification",
                    `review-${item.clientId}-classification`,
                  )
                }
              >
                <span className="w-16 shrink-0 text-sm text-muted-foreground">
                  {item.type === "expense" || item.type === "income"
                    ? "분류"
                    : "유형"}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {item.type === "expense" || item.type === "income"
                    ? (categoryLabel ?? "선택 필요")
                    : getTypeLabel(item.type)}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-0 py-2 text-left"
                id={`review-${item.clientId}-sources`}
                aria-label={`기록 ${index + 1} 금융수단 수정: ${sourceLabel}`}
                onClick={() =>
                  onEdit(
                    item.clientId,
                    "sources",
                    `review-${item.clientId}-sources`,
                  )
                }
              >
                <span className="w-16 shrink-0 text-sm text-muted-foreground">
                  {item.type === "transfer"
                    ? "금융수단"
                    : item.type === "income"
                      ? "입금 위치"
                      : item.type === "non_expense_withdrawal"
                        ? "출금처"
                        : "결제 방법"}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {sourceLabel}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-0 py-2 text-left"
                id={`review-${item.clientId}-datesBooks`}
                aria-label={`기록 ${index + 1} 날짜와 장부 수정: ${item.transactedAt}, ${book?.name ?? "장부 미선택"}`}
                onClick={() =>
                  onEdit(
                    item.clientId,
                    "datesBooks",
                    `review-${item.clientId}-datesBooks`,
                  )
                }
              >
                <span className="w-16 shrink-0 text-sm text-muted-foreground">
                  날짜·장부
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {item.transactedAt} · {book?.name ?? "장부 미선택"}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Button>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                aria-label={`메모 ${index + 1} ${isMemoOpen ? "접기" : item.memo ? "편집" : "추가"}`}
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
        className="min-h-11 w-full rounded-[12px]"
        onClick={onAdd}
      >
        기록 추가
      </Button>
      <ComposerActionBar
        label={isSaving ? "저장 중..." : "모두 저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
