"use client";

import { PlusIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SegmentedChoiceGroup } from "@/components/layout/SegmentedChoiceGroup";
import { AmountText } from "@/components/layout/screen";
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
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="min-w-0 space-y-2">
              <Label className="text-sm text-gray-700">유형</Label>
              <SegmentedChoiceGroup
                value={defaultType}
                columns={4}
                onValueChange={(value) => form.setValue("defaultType", value)}
                options={[
                  {
                    value: "expense",
                    label: "지출",
                    selectedClassName: "bg-[#3182F6] text-white",
                  },
                  {
                    value: "income",
                    label: "수입",
                    selectedClassName: "bg-[#F04452] text-white",
                  },
                  { value: "transfer", label: "내부이체" },
                  {
                    value: "non_expense_withdrawal",
                    label: "비지출",
                    selectedClassName: "bg-gray-800 text-white",
                  },
                ]}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label className="text-sm text-gray-700">공개범위</Label>
              <SegmentedChoiceGroup
                value={defaultIsShared ? "shared" : "private"}
                columns={2}
                onValueChange={(value) =>
                  form.setValue("defaultIsShared", value === "shared")
                }
                options={[
                  { value: "shared", label: "공용" },
                  { value: "private", label: "개인" },
                ]}
              />
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
        {fields.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
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
                    "relative flex flex-col gap-1.5 p-4 transition-colors",
                    hasError ? "bg-red-50/60" : "bg-white hover:bg-gray-50/70",
                  )}
                >
                  {/* The main click target for editing */}
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full cursor-pointer text-left focus:outline-none"
                    onClick={() => onEditItem(index)}
                  />

                  {/* Top Row: Type & share scope on top-left, delete button on top-right */}
                  <div className="relative flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${typeColor}`}>
                        {typeLabel}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isShared ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.isShared ? "공용" : "개인"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(index);
                      }}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 pointer-events-auto"
                      aria-label="내역 삭제"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Title Row */}
                  <div className="relative z-10 pointer-events-none min-w-0">
                    <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold text-gray-900">
                      {item.title || "내용을 입력해주세요"}
                    </span>
                  </div>

                  {/* Tag Row: show up to 5 tags, wrapping, no +N */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="relative z-10 pointer-events-none mt-0.5 flex flex-wrap items-center gap-1">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom Row: category context on bottom-left, signed full amount on bottom-right */}
                  <div className="relative z-10 pointer-events-none mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span>{getCategoryName(item.type, item.categoryId)}</span>
                      {hasError && (
                        <span className="text-[11px] text-red-500 font-medium">
                          필수 입력 사항이 누락되었습니다.
                        </span>
                      )}
                    </div>

                    <AmountText
                      amount={Number(item.amount) || 0}
                      sign={
                        item.type === "transfer"
                          ? ""
                          : item.type === "income"
                            ? "+"
                            : "-"
                      }
                      tone={
                        item.type === "income"
                          ? "income"
                          : item.type === "expense"
                            ? "expense"
                            : "neutral"
                      }
                      title={`${item.type === "transfer" ? "" : item.type === "income" ? "+" : "-"}${formatCurrency(Number(item.amount) || 0)}`}
                      className="text-sm font-bold whitespace-nowrap text-right ml-auto"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
