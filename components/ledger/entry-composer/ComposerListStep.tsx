"use client";

import { PlusIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

interface ComposerListStepProps {
  mode: "full" | "daily";
  onEditItem: (index: number) => void;
  onSubmit: (values: LedgerComposerFormValues) => void | Promise<void>;
  isSubmitting: boolean;
}

export function ComposerListStep({
  mode,
  onEditItem,
  onSubmit,
  isSubmitting,
}: ComposerListStepProps) {
  const form = useFormContext<LedgerComposerFormValues>();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const [negativeBalanceWarning, setNegativeBalanceWarning] = useState<{
    locationName: string;
    nextBalance: number;
  } | null>(null);
  const skipNegativeBalanceConfirmRef = useRef(false);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const defaultType = useWatch({ control: form.control, name: "defaultType" });
  const defaultIsShared = useWatch({
    control: form.control,
    name: "defaultIsShared",
  });
  const currentDefaultDate = useWatch({
    control: form.control,
    name: "defaultDate",
  });
  const items = useWatch({ control: form.control, name: "items" });

  const handleAddItem = () => {
    const newIndex = fields.length;
    append({
      type: defaultType,
      isShared: defaultIsShared,
      amount: "",
      title: "",
      categoryId: "",
      paymentMethodId: undefined,
      accountId: undefined,
      fromValue: "",
      toValue: "",
      transactedAt: currentDefaultDate,
      memo: "",
    });
    onEditItem(newIndex);
  };

  const handleDefaultDateChange = (value: string) => {
    form.setValue("defaultDate", value, { shouldValidate: true });
  };

  const getCategoryName = (
    type: "expense" | "income" | "transfer" | "non_expense_withdrawal",
    categoryId?: string,
  ) => {
    if (type === "transfer") return "내부이체";
    if (type === "non_expense_withdrawal") return "비지출 출금";
    const cats = type === "expense" ? expenseCategories : incomeCategories;
    return cats.find((c) => c.id === categoryId)?.name || "카테고리 없음";
  };

  const getNegativeBalanceWarning = (
    values: LedgerComposerFormValues,
  ): { locationName: string; nextBalance: number } | null => {
    for (const item of values.items) {
      if (item.type !== "transfer" || !item.fromValue) continue;
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      if (item.fromValue.startsWith("acc:")) {
        const accountId = item.fromValue.slice(4);
        const account = accounts.find(
          (candidate) => candidate.id === accountId,
        );
        if (!account || account.balance === null) continue;
        const nextBalance = account.balance - amount;
        if (nextBalance < 0) {
          return { locationName: account.name, nextBalance };
        }
      }

      if (item.fromValue.startsWith("pm:")) {
        const paymentMethodId = item.fromValue.slice(3);
        const paymentMethod = paymentMethods.find(
          (candidate) => candidate.id === paymentMethodId,
        );
        if (!paymentMethod || paymentMethod.balance === null) continue;
        const nextBalance = paymentMethod.balance - amount;
        if (nextBalance < 0) {
          return { locationName: paymentMethod.name, nextBalance };
        }
      }
    }

    return null;
  };

  const onInvalid = () => {
    toast.error(
      "입력한 내용 중 필수 값이 누락되었거나 오류가 있습니다. 빨간색 표시를 확인해주세요.",
    );
  };

  const handleValidSubmit = (values: LedgerComposerFormValues) => {
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
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-sm text-gray-700">유형</Label>
              <Select
                value={defaultType}
                onValueChange={(value) => {
                  form.setValue(
                    "defaultType",
                    value as
                      | "expense"
                      | "income"
                      | "transfer"
                      | "non_expense_withdrawal",
                  );
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">지출</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                  <SelectItem value="transfer">내부이체</SelectItem>
                  <SelectItem value="non_expense_withdrawal">
                    비지출 출금
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1">
              <Label className="text-sm text-gray-700">공개범위</Label>
              <Select
                value={defaultIsShared ? "shared" : "private"}
                onValueChange={(value) =>
                  form.setValue("defaultIsShared", value === "shared")
                }
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">공용</SelectItem>
                  <SelectItem value="private">개인</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <Label className="text-sm text-gray-700">
              {mode === "daily" ? "선택한 날짜" : "기본 날짜"}
            </Label>
            <DatePickerInput
              value={currentDefaultDate}
              onChange={handleDefaultDateChange}
              className="h-10 w-full"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-50 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="w-full rounded-xl border-dashed h-11 px-6"
          >
            <PlusIcon className="size-4 mr-2" />
            내역 추가
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = items[index];
            if (!item) return null;
            const typeLabel =
              item.type === "income"
                ? "수입"
                : item.type === "transfer"
                  ? "내부이체"
                  : item.type === "non_expense_withdrawal"
                    ? "비지출 출금"
                    : "지출";
            const typeColor =
              item.type === "income"
                ? "text-blue-600"
                : item.type === "transfer"
                  ? "text-gray-600"
                  : item.type === "non_expense_withdrawal"
                    ? "text-purple-600"
                    : "text-red-600";
            const hasError = !!form.formState.errors.items?.[index];

            return (
              <div
                key={field.id}
                className={cn(
                  "relative mt-2 flex items-center gap-2 rounded-2xl border p-4 shadow-sm transition-colors",
                  hasError
                    ? "border-red-200 bg-red-50/10 hover:border-red-300"
                    : "border-gray-100 bg-white hover:border-gray-200",
                )}
              >
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: non-navigation item click */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: list item wrapper click */}
                <div
                  className="flex-1 flex items-center justify-between cursor-pointer"
                  onClick={() => onEditItem(index)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${typeColor}`}>
                        {typeLabel}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isShared ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.isShared ? "공유" : "개인"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.title || "내용을 입력해주세요"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getCategoryName(item.type, item.categoryId)}
                    </div>
                    {hasError && (
                      <div className="text-[11px] text-red-500 mt-1 font-medium">
                        필수 입력 사항이 누락되었습니다.
                      </div>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {item.amount
                        ? formatCurrency(Number(item.amount))
                        : "0원"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(index);
                  }}
                  className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-white shadow-md hover:bg-red-500 transition-colors z-10"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          disabled={isSubmitting || fields.length === 0}
          onClick={form.handleSubmit(handleValidSubmit, onInvalid)}
          className="h-12 w-full rounded-xl"
        >
          {isSubmitting ? "저장 중..." : `${fields.length}건 저장하기`}
        </Button>
      </div>

      <Dialog
        open={Boolean(negativeBalanceWarning)}
        onOpenChange={(open) => {
          if (!open) setNegativeBalanceWarning(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>잔액이 음수가 됩니다</DialogTitle>
            <DialogDescription>
              {negativeBalanceWarning
                ? `저장하면 ${negativeBalanceWarning.locationName} 잔액이 ${formatCurrency(
                    negativeBalanceWarning.nextBalance,
                  )}이 됩니다. 그래도 저장할까요?`
                : null}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-500">
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
