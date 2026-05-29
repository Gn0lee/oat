"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { LedgerMoneySourceCombobox } from "@/components/ledger/LedgerMoneySourceCombobox";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
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
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

interface ComposerFormStepProps {
  index: number;
  mode: "full" | "daily";
  onBack: () => void;
}

export function ComposerFormStep({
  index,
  mode,
  onBack,
}: ComposerFormStepProps) {
  const form = useFormContext<LedgerComposerFormValues>();
  const [snapshot] = useState(() => form.getValues(`items.${index}`));

  const handleCancel = () => {
    form.setValue(`items.${index}`, snapshot);
    onBack();
  };

  const handleConfirm = async () => {
    const isValid = await form.trigger(`items.${index}`);
    if (isValid) {
      onBack();
    }
  };

  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const itemType = form.watch(`items.${index}.type`);
  const itemIsShared = form.watch(`items.${index}.isShared`);
  const categories =
    itemType === "expense" ? expenseCategories : incomeCategories;
  const errors = form.formState.errors.items?.[index];

  const moneySourceValue = getLedgerMoneySourceValue({
    paymentMethodId: form.watch(`items.${index}.paymentMethodId`),
    accountId: form.watch(`items.${index}.accountId`),
  });

  const handleMoneySourceChange = (value: string) => {
    if (value.startsWith("pm:")) {
      form.setValue(`items.${index}.paymentMethodId`, value.slice(3));
      form.setValue(`items.${index}.accountId`, undefined);
      return;
    }
    if (value.startsWith("acc:")) {
      form.setValue(`items.${index}.accountId`, value.slice(4));
      form.setValue(`items.${index}.paymentMethodId`, undefined);
      return;
    }
    form.setValue(`items.${index}.paymentMethodId`, undefined);
    form.setValue(`items.${index}.accountId`, undefined);
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
      >
        <XIcon className="size-5" />
      </Button>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 pt-16">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-sm text-gray-700">유형</Label>
              <Select
                value={itemType}
                onValueChange={(value) => {
                  form.setValue(
                    `items.${index}.type`,
                    value as "expense" | "income",
                  );
                  form.setValue(`items.${index}.categoryId`, "");
                  form.setValue(`items.${index}.paymentMethodId`, undefined);
                  form.setValue(`items.${index}.accountId`, undefined);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">지출</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1">
              <Label className="text-sm text-gray-700">공개범위</Label>
              <Select
                value={itemIsShared ? "shared" : "private"}
                onValueChange={(value) =>
                  form.setValue(`items.${index}.isShared`, value === "shared")
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
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">카테고리 *</Label>
            <Select
              value={form.watch(`items.${index}.categoryId`)}
              onValueChange={(value) =>
                form.setValue(`items.${index}.categoryId`, value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.categoryId && (
              <p className="text-xs text-red-500">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_112px] gap-2">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">내용 *</Label>
              <Input
                placeholder="예: 점심, 커피"
                {...form.register(`items.${index}.title`)}
              />
              {errors?.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-700">금액 *</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="text-right"
                {...form.register(`items.${index}.amount`)}
              />
              {errors?.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                {itemType === "expense" ? "결제 방법" : "입금 계좌"}
              </Label>
              <LedgerMoneySourceCombobox
                mode={itemType}
                value={moneySourceValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                placeholder="선택 안함"
                onValueChange={handleMoneySourceChange}
              />
            </div>
          </div>

          {mode === "full" && (
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">날짜</Label>
              <DatePickerInput
                value={form.watch(`items.${index}.transactedAt`)}
                onChange={(value) =>
                  form.setValue(`items.${index}.transactedAt`, value, {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">메모</Label>
            <Textarea
              placeholder="추가로 남기고 싶은 내용을 입력하세요"
              rows={2}
              className="resize-none"
              {...form.register(`items.${index}.memo`)}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0">
        <Button
          type="button"
          onClick={handleConfirm}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          완료
        </Button>
      </div>
    </>
  );
}
