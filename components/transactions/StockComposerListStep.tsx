"use client";

import {
  ChevronRightIcon,
  PackagePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { TransactionTypeSelector } from "@/components/transactions/TransactionTypeSelector";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";
import { DEFAULT_TRANSACTION_ITEM } from "@/schemas/multi-transaction-form";

interface StockComposerListStepProps {
  mode?: "full" | "daily";
  onEditItem: (index: number) => void;
  onSubmit: (data: MultiTransactionFormData) => void;
  isSubmitting: boolean;
}

export function StockComposerListStep({
  mode = "full",
  onEditItem,
  onSubmit,
  isSubmitting,
}: StockComposerListStepProps) {
  const form = useFormContext<MultiTransactionFormData>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchType = useWatch({ control: form.control, name: "type" });
  const watchItems = useWatch({ control: form.control, name: "items" });
  const watchTransactedAt = useWatch({
    control: form.control,
    name: "transactedAt",
  });

  const getValidItems = () => {
    return watchItems.filter(
      (item) => item.stock && item.quantity && Number(item.quantity) > 0,
    );
  };
  const validCount = getValidItems().length;

  const handleAddItem = () => {
    const newIndex = fields.length;
    append({
      ...DEFAULT_TRANSACTION_ITEM,
      transactedAt: watchTransactedAt,
      accountId: form.getValues("accountId"),
    });
    onEditItem(newIndex);
  };

  const onInvalid = () => {
    toast.error(
      "입력한 내용 중 필수 값이 누락되었거나 오류가 있습니다. 빨간색 표시를 확인해주세요.",
    );
  };

  return (
    <div className="space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <TransactionTypeSelector control={form.control} variant="inline" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-gray-700">
              {mode === "daily" ? "선택한 날짜" : "거래일"}
            </Label>
            <DatePickerInput
              value={watchTransactedAt ?? ""}
              onChange={(v) =>
                form.setValue("transactedAt", v, { shouldValidate: true })
              }
              className="h-11 rounded-xl"
            />
            {form.formState.errors.transactedAt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.transactedAt.message}
              </p>
            )}
          </div>

          <AccountSelector control={form.control} variant="inline" />
        </div>

        {/* 종목 추가 버튼 통합 */}
        <div className="pt-2 border-t border-gray-50 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="w-full rounded-xl border-dashed h-11 px-6"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            종목 추가
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <PackagePlusIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-900 font-medium">등록할 종목이 없습니다</p>
            <p className="text-gray-500 text-sm">
              아래 버튼을 눌러 거래할 종목을 추가해주세요
            </p>
          </div>
          <Button type="button" onClick={handleAddItem} className="mt-2">
            <PlusIcon className="h-4 w-4 mr-2" />첫 번째 종목 추가
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {fields.map((field, index) => {
              const item = watchItems[index];
              if (!item) return null;

              const label = item?.stock?.name ?? `종목 ${index + 1}`;
              const subtotal =
                (Number(item.quantity) || 0) * (Number(item.price) || 0);
              const currency = item.stock?.market === "US" ? "USD" : "KRW";
              const hasError = !!form.formState.errors.items?.[index];

              return (
                <div
                  key={field.id}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border p-4 shadow-sm transition-colors",
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
                        <span className="text-sm font-medium text-gray-900">
                          {label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span>수량 {item.quantity || 0}</span>
                        <span>
                          단가{" "}
                          {formatCurrency(Number(item.price) || 0, currency)}
                        </span>
                      </div>
                      {hasError && (
                        <div className="text-[11px] text-red-500 mt-1 font-medium">
                          종목, 수량, 단가를 확인해주세요.
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {subtotal > 0
                          ? formatCurrency(subtotal, currency)
                          : "0원"}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(index);
                    }}
                    className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {fields.length > 0 && (
            <TransactionSummary items={watchItems} type={watchType} />
          )}

          <Button
            type="button"
            className="w-full h-14 rounded-xl text-base font-semibold"
            disabled={isSubmitting || validCount === 0}
            onClick={form.handleSubmit(onSubmit, onInvalid)}
          >
            {isSubmitting
              ? "등록 중..."
              : `${watchType === "buy" ? "매수" : "매도"} ${validCount}건 일괄 등록`}
          </Button>
        </div>
      )}
    </div>
  );
}
