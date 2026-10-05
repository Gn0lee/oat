"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  type UseFieldArrayReturn,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { AmountText } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccounts } from "@/hooks/use-accounts";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { createComposerDraft } from "@/lib/ledger/composer";
import { formatCurrency } from "@/lib/utils/format";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";

interface ComposerListStepProps {
  itemsArray: UseFieldArrayReturn<LedgerComposerValues, "items">;
  initialBookId: string;
  initialDate: string;
  onEditItem: (clientId: string) => void;
  onSubmit: (values: LedgerComposerValues) => void | Promise<void>;
  isSubmitting: boolean;
}

export function ComposerListStep({
  initialBookId,
  initialDate,
  itemsArray,
  onEditItem,
  onSubmit,
  isSubmitting,
}: ComposerListStepProps) {
  const form = useFormContext<LedgerComposerValues>();
  const { data: books = [] } = useLedgerBooks();
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const [negativeBalanceWarning, setNegativeBalanceWarning] = useState<{
    locationName: string;
    nextBalance: number;
  } | null>(null);
  const skipNegativeBalanceConfirmRef = useRef(false);
  const { fields, append, remove } = itemsArray;
  const items = useWatch({ control: form.control, name: "items" }) ?? [];

  const handleAddItem = () => {
    const item = createComposerDraft({
      clientId: crypto.randomUUID(),
      bookId: initialBookId,
      date: initialDate,
    });
    append(item);
    onEditItem(item.clientId);
  };

  const getNegativeBalanceWarning = (values: LedgerComposerValues) => {
    for (const item of values.items) {
      const fromValue = item.fromValue;
      if (item.type !== "transfer" || !fromValue) continue;
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (fromValue.startsWith("acc:")) {
        const account = accounts.find(
          (candidate) => candidate.id === fromValue.slice(4),
        );
        if (
          account?.balance !== null &&
          account &&
          account.balance - amount < 0
        )
          return {
            locationName: account.name,
            nextBalance: account.balance - amount,
          };
      }
      if (fromValue.startsWith("pm:")) {
        const method = paymentMethods.find(
          (candidate) => candidate.id === fromValue.slice(3),
        );
        if (method?.balance !== null && method && method.balance - amount < 0)
          return {
            locationName: method.name,
            nextBalance: method.balance - amount,
          };
      }
    }
    return null;
  };

  const onInvalid = () =>
    toast.error("입력한 내용 중 필수 값이 누락되었거나 오류가 있습니다.");
  const handleValidSubmit = (values: LedgerComposerValues) => {
    if (!skipNegativeBalanceConfirmRef.current) {
      const warning = getNegativeBalanceWarning(values);
      if (warning) {
        setNegativeBalanceWarning(warning);
        return;
      }
    }
    skipNegativeBalanceConfirmRef.current = false;
    onSubmit(values);
  };

  return (
    <div className="space-y-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">가계부 기록</h1>
          <p className="text-sm text-muted-foreground">
            날짜와 장부는 기록마다 선택할 수 있어요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-[12px]"
          onClick={handleAddItem}
        >
          <Plus className="mr-2 size-4" />
          기록 추가
        </Button>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card text-foreground">
        {fields.map((field, index) => {
          const item = items[index];
          if (!item) return null;
          const book = books.find((candidate) => candidate.id === item.bookId);
          const typeLabel =
            item.type === "income"
              ? "수입"
              : item.type === "transfer"
                ? "내부이체"
                : item.type === "non_expense_withdrawal"
                  ? "비지출 출금"
                  : "지출";
          return (
            <div key={field.id} className="flex items-start gap-3 p-4">
              <button
                type="button"
                onClick={() => onEditItem(item.clientId)}
                className="min-h-16 min-w-0 flex-1 rounded-[12px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="block text-xs text-muted-foreground">
                  {typeLabel} · {book?.name ?? "장부 미선택"} ·{" "}
                  {item.transactedAt}
                </span>
                <span className="mt-1 line-clamp-2 break-words font-medium">
                  {item.title || "내용을 입력해 주세요"}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.type === "transfer"
                    ? "출발지·도착지"
                    : item.type === "non_expense_withdrawal"
                      ? "출금처"
                      : "분류 및 금융수단"}{" "}
                  수정
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <AmountText
                  amount={Number(item.amount) || 0}
                  sign={
                    item.type === "income"
                      ? "+"
                      : item.type === "transfer"
                        ? ""
                        : "-"
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`${index + 1}번째 기록 삭제`}
                  className="size-11 p-0"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        className="min-h-12 w-full rounded-[12px]"
        disabled={isSubmitting || fields.length === 0}
        onClick={form.handleSubmit(handleValidSubmit, onInvalid)}
      >
        {isSubmitting ? "저장 중..." : "모두 저장"}
      </Button>
      <Dialog
        open={Boolean(negativeBalanceWarning)}
        onOpenChange={(open) => !open && setNegativeBalanceWarning(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>잔액이 음수가 됩니다</DialogTitle>
            <DialogDescription>
              {negativeBalanceWarning
                ? `저장하면 ${negativeBalanceWarning.locationName} 잔액이 ${formatCurrency(negativeBalanceWarning.nextBalance)}이 됩니다. 그래도 저장할까요?`
                : null}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            실제 잔액과 다르면 나중에 실제 잔액 맞추기로 조정할 수 있어요.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNegativeBalanceWarning(null)}
            >
              다시 확인
            </Button>
            <Button
              type="button"
              onClick={() => {
                setNegativeBalanceWarning(null);
                skipNegativeBalanceConfirmRef.current = true;
                form.handleSubmit(handleValidSubmit, onInvalid)();
              }}
            >
              그래도 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
