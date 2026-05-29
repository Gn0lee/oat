"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LedgerMoneySourceCombobox } from "@/components/ledger/LedgerMoneySourceCombobox";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { TransferItemFormData, TransferLocation } from "@/lib/api/ledger";

const transferFormSchema = z
  .object({
    amount: z.string().min(1, "금액을 입력해주세요."),
    title: z.string().min(1, "내용을 입력해주세요."),
    fromValue: z.string().min(1, "출발지를 선택해주세요."),
    toValue: z.string().min(1, "도착지를 선택해주세요."),
    transactedAt: z.string().min(1, "날짜를 선택해주세요."),
    memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  })
  .refine((value) => value.fromValue !== value.toValue, {
    path: ["toValue"],
    message: "출발지와 다른 도착지를 선택해주세요.",
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface AddTransferStepProps {
  onNext: (item: TransferItemFormData) => void;
  defaultDate?: string;
  submitLabel?: string;
}

const today = format(new Date(), "yyyy-MM-dd");

function parseLocation(value: string): TransferLocation {
  if (value.startsWith("acc:")) {
    return { kind: "account", id: value.slice(4) };
  }
  return { kind: "paymentMethod", id: value.slice(3) };
}

export function AddTransferStep({
  onNext,
  defaultDate = today,
  submitLabel = "다음",
}: AddTransferStepProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      amount: "",
      title: "",
      fromValue: "",
      toValue: "",
      transactedAt: defaultDate,
      memo: "",
    },
  });

  const fromValue = form.watch("fromValue");
  const toValue = form.watch("toValue");

  const handleSubmit = form.handleSubmit((values) => {
    onNext({
      amount: values.amount,
      title: values.title,
      from: parseLocation(values.fromValue),
      to: parseLocation(values.toValue),
      transactedAt: values.transactedAt,
      memo: values.memo,
    });
  });

  const errors = form.formState.errors;

  return (
    <div className="space-y-6">
      <p className="text-gray-500">이체 내역을 입력해주세요.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4 border border-gray-100">
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">금액 *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₩
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="pl-7"
                {...form.register("amount")}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">내용 *</Label>
            <Input
              placeholder="예: 카카오페이 충전, 상품권 환급"
              {...form.register("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">출발지 *</Label>
              <LedgerMoneySourceCombobox
                mode="transfer"
                value={form.watch("fromValue")}
                paymentMethods={paymentMethods}
                accounts={accounts}
                includeClearOption={false}
                excludedValues={toValue ? [toValue] : []}
                placeholder="선택"
                onValueChange={(value) => {
                  form.setValue("fromValue", value, { shouldValidate: true });
                  if (value === form.watch("toValue")) {
                    form.setValue("toValue", "", { shouldValidate: true });
                  }
                }}
              />
              {errors.fromValue && (
                <p className="text-xs text-red-500">
                  {errors.fromValue.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-700">도착지 *</Label>
              <LedgerMoneySourceCombobox
                mode="transfer"
                value={form.watch("toValue")}
                paymentMethods={paymentMethods}
                accounts={accounts}
                includeClearOption={false}
                excludedValues={fromValue ? [fromValue] : []}
                placeholder="선택"
                onValueChange={(value) =>
                  form.setValue("toValue", value, { shouldValidate: true })
                }
              />
              {errors.toValue && (
                <p className="text-xs text-red-500">{errors.toValue.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">날짜</Label>
            <DatePickerInput
              value={form.watch("transactedAt")}
              onChange={(value) =>
                form.setValue("transactedAt", value, { shouldValidate: true })
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">메모</Label>
            <Textarea
              placeholder="추가로 남기고 싶은 내용을 입력하세요"
              rows={2}
              className="resize-none"
              {...form.register("memo")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            선불/상품권/현금 잔액은 가계부용 보조잔액이며 총자산에는 포함되지
            않습니다.
          </p>
          <p className="text-xs text-gray-500">
            타인에게 보낸 돈은 이체가 아니라 지출로 기록해주세요.
          </p>
        </div>

        <Button type="submit" className="w-full rounded-xl py-3">
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}
