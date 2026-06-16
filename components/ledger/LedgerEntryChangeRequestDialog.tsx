"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useCreateRecordChangeRequest } from "@/hooks/use-record-change-requests";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import {
  buildLedgerRecordUpdateProposedChanges,
  type LedgerRecordUpdateRequestFormValues,
} from "@/lib/ledger/record-change-request";
import { formatCurrency } from "@/lib/utils/format";
import type { CategoryType } from "@/types";

type RequestMode = "update" | "delete";

interface LedgerEntryChangeRequestDialogProps {
  entry: LedgerEntryWithDetails | null;
  mode: RequestMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitialMoneySourceId(entry: LedgerEntryWithDetails) {
  const value = getLedgerMoneySourceValue({
    paymentMethodId:
      entry.type === "expense" || entry.type === "non_expense_withdrawal"
        ? entry.fromPaymentMethodId
        : entry.toPaymentMethodId,
    accountId:
      entry.type === "expense" || entry.type === "non_expense_withdrawal"
        ? entry.fromAccountId
        : entry.toAccountId,
  });

  return value || "none";
}

function getInitialValues(
  entry: LedgerEntryWithDetails,
): LedgerRecordUpdateRequestFormValues {
  return {
    amount: entry.amount,
    title: entry.title ?? "",
    categoryId: entry.categoryId,
    moneySourceId: getInitialMoneySourceId(entry),
    transactedAt: entry.transactedAt.slice(0, 10),
    memo: entry.memo,
  };
}

export function LedgerEntryChangeRequestDialog({
  entry,
  mode,
  open,
  onOpenChange,
}: LedgerEntryChangeRequestDialogProps) {
  const createMutation = useCreateRecordChangeRequest();
  const [values, setValues] =
    useState<LedgerRecordUpdateRequestFormValues | null>(null);
  const [message, setMessage] = useState("");

  const categoryType =
    entry?.type === "transfer" || entry?.type === "non_expense_withdrawal"
      ? undefined
      : entry?.type;

  const { data: categories = [] } = useCategories(categoryType as CategoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  useEffect(() => {
    if (!entry || !open) return;
    setValues(getInitialValues(entry));
    setMessage("");
  }, [entry, open]);

  const moneySourceOptions = useMemo(
    () => [
      { value: "none", label: "선택 안함" },
      ...paymentMethods
        .filter((item) => item.ownerId === entry?.ownerId)
        .map((item) => ({
          value: `pm:${item.id}`,
          label: item.name,
        })),
      ...accounts
        .filter((item) => item.ownerId === entry?.ownerId)
        .map((item) => ({
          value: `acc:${item.id}`,
          label: item.name,
        })),
    ],
    [accounts, paymentMethods, entry?.ownerId],
  );

  if (!entry || !values) return null;

  const isUpdate = mode === "update";
  const title = isUpdate ? "수정 요청" : "삭제 요청";
  const description = isUpdate
    ? "바꾸고 싶은 값을 입력하면 기록 소유자에게 요청이 전달됩니다."
    : "기록 소유자에게 삭제 사유가 전달됩니다.";

  const handleSubmit = async () => {
    try {
      if (isUpdate) {
        const proposedChanges = buildLedgerRecordUpdateProposedChanges(
          entry,
          values,
        );

        if (Object.keys(proposedChanges).length === 0) {
          toast.error("변경할 항목을 하나 이상 입력해주세요.");
          return;
        }

        await createMutation.mutateAsync({
          targetType: "ledger_entry",
          targetId: entry.id,
          requestType: "update",
          message: message.trim() || undefined,
          proposedChanges,
        });
      } else {
        if (!message.trim()) {
          toast.error("삭제 사유를 입력해주세요.");
          return;
        }

        await createMutation.mutateAsync({
          targetType: "ledger_entry",
          targetId: entry.id,
          requestType: "delete",
          message: message.trim() || undefined,
          proposedChanges: {},
        });
      }

      toast.success("요청을 보냈습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청 생성에 실패했습니다.",
      );
    }
  };

  const updateValue = <K extends keyof LedgerRecordUpdateRequestFormValues>(
    key: K,
    value: LedgerRecordUpdateRequestFormValues[K],
  ) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 p-5 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">
              {entry.title ?? entry.categoryName ?? "미분류"}
            </span>
            <span className="font-semibold">
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.ownerName} · {entry.transactedAt.slice(0, 10)}
          </p>
        </div>

        {isUpdate ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-amount">금액 (원)</Label>
              <Input
                id="request-amount"
                type="number"
                inputMode="numeric"
                min="0"
                value={values.amount}
                onChange={(event) =>
                  updateValue("amount", Number(event.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-title">내용</Label>
              <Input
                id="request-title"
                value={values.title}
                onChange={(event) => updateValue("title", event.target.value)}
              />
            </div>

            <div
              className={
                entry.type === "non_expense_withdrawal"
                  ? "grid grid-cols-1"
                  : "grid grid-cols-2 gap-3"
              }
            >
              {entry.type !== "non_expense_withdrawal" && (
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select
                    value={values.categoryId ?? "none"}
                    onValueChange={(value) =>
                      updateValue("categoryId", value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {entry.type === "expense"
                    ? "결제 방법"
                    : entry.type === "non_expense_withdrawal"
                      ? "출금처"
                      : "입금 계좌"}
                </Label>
                <Select
                  value={values.moneySourceId}
                  onValueChange={(value) => updateValue("moneySourceId", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moneySourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-date">날짜</Label>
              <DatePickerInput
                id="request-date"
                value={values.transactedAt}
                onChange={(value) => updateValue("transactedAt", value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-memo">메모</Label>
              <Textarea
                id="request-memo"
                value={values.memo ?? ""}
                rows={2}
                className="resize-none"
                onChange={(event) => updateValue("memo", event.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="request-message">
            {isUpdate ? "요청 메시지 (선택)" : "삭제 사유"}
          </Label>
          <Textarea
            id="request-message"
            value={message}
            rows={3}
            className="resize-none"
            placeholder={
              isUpdate
                ? "소유자가 확인할 수 있는 설명을 남겨주세요."
                : "삭제가 필요한 이유를 입력해주세요."
            }
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <DialogFooter className="mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "요청 중..." : "요청 보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
