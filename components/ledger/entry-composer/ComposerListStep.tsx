"use client";

import { ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AddTransferStep } from "@/components/ledger/funnel/AddTransferStep";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils/cn";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

interface ComposerListStepProps {
  mode: "full" | "daily";
  onEditItem: (index: number) => void;
  onSubmit: (values: LedgerComposerFormValues) => void | Promise<void>;
  isSubmitting: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: type comes from payload builder hook
  onTransferSubmit: (transferItem: any) => void;
  isTransferSubmitting: boolean;
}

export function ComposerListStep({
  mode,
  onEditItem,
  onSubmit,
  isSubmitting,
  onTransferSubmit,
  isTransferSubmitting,
}: ComposerListStepProps) {
  const form = useFormContext<LedgerComposerFormValues>();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");

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
    if (defaultType === "transfer") return;
    const newIndex = fields.length;
    append({
      type: defaultType,
      isShared: defaultIsShared,
      amount: "",
      title: "",
      categoryId: "",
      paymentMethodId: undefined,
      accountId: undefined,
      transactedAt: currentDefaultDate,
      memo: "",
    });
    onEditItem(newIndex);
  };

  const handleDefaultDateChange = (value: string) => {
    form.setValue("defaultDate", value, { shouldValidate: true });
    if (mode === "daily") {
      fields.forEach((_, index) => {
        form.setValue(`items.${index}.transactedAt`, value, {
          shouldValidate: true,
        });
      });
    }
  };

  const getCategoryName = (type: "expense" | "income", categoryId: string) => {
    const cats = type === "expense" ? expenseCategories : incomeCategories;
    return cats.find((c) => c.id === categoryId)?.name || "카테고리 없음";
  };

  const onInvalid = () => {
    toast.error(
      "입력한 내용 중 필수 값이 누락되었거나 오류가 있습니다. 빨간색 표시를 확인해주세요.",
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-sm text-gray-700">유형</Label>
              <Select
                value={defaultType}
                onValueChange={(value) => {
                  form.setValue(
                    "defaultType",
                    value as "expense" | "income" | "transfer",
                  );
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">지출</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                  <SelectItem value="transfer">이체</SelectItem>
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
      </div>

      {defaultType === "transfer" ? (
        <AddTransferStep
          defaultDate={currentDefaultDate}
          submitLabel={
            isTransferSubmitting ? "저장 중..." : "이체 기록 저장하기"
          }
          onNext={onTransferSubmit}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {fields.map((field, index) => {
              const item = items[index];
              if (!item) return null;
              const typeLabel = item.type === "income" ? "수입" : "지출";
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
                        <span
                          className={`text-xs font-semibold ${item.type === "income" ? "text-blue-600" : "text-red-600"}`}
                        >
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
                          ? `${Number(item.amount).toLocaleString()}원`
                          : "0원"}
                      </span>
                      <ChevronRightIcon className="size-4 text-gray-400" />
                    </div>
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                      }}
                      className="size-8 text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="h-12 w-full rounded-xl border-dashed"
          >
            <PlusIcon className="size-4" />
            내역 추가
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || fields.length === 0}
            onClick={form.handleSubmit(onSubmit, onInvalid)}
            className="h-12 w-full rounded-xl"
          >
            {isSubmitting ? "저장 중..." : `${fields.length}건 저장하기`}
          </Button>
        </div>
      )}
    </div>
  );
}
