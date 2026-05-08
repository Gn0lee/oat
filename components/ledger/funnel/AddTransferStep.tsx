"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import {
  isTransferCapablePaymentMethod,
  type TransferItemFormData,
  type TransferLocation,
} from "@/lib/api/ledger";

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
  onBack: () => void;
}

const today = format(new Date(), "yyyy-MM-dd");

function parseLocation(value: string): TransferLocation {
  if (value.startsWith("acc:")) {
    return { kind: "account", id: value.slice(4) };
  }
  return { kind: "paymentMethod", id: value.slice(3) };
}

export function AddTransferStep({ onNext, onBack }: AddTransferStepProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const transferCapablePaymentMethods = paymentMethods.filter((pm) =>
    isTransferCapablePaymentMethod(pm.type),
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      amount: "",
      title: "",
      fromValue: "",
      toValue: "",
      transactedAt: today,
      memo: "",
    },
  });

  const fromValue = form.watch("fromValue");

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

  const renderLocationOptions = (excludeValue?: string) => (
    <>
      {accounts.length > 0 && (
        <SelectGroup>
          <SelectLabel>계좌</SelectLabel>
          {accounts.map((account) => {
            const value = `acc:${account.id}`;
            if (value === excludeValue) return null;
            return (
              <SelectItem key={account.id} value={value}>
                {account.name}
              </SelectItem>
            );
          })}
        </SelectGroup>
      )}
      {accounts.length > 0 && transferCapablePaymentMethods.length > 0 && (
        <SelectSeparator />
      )}
      {transferCapablePaymentMethods.length > 0 && (
        <SelectGroup>
          <SelectLabel>선불/상품권/현금</SelectLabel>
          {transferCapablePaymentMethods.map((paymentMethod) => {
            const value = `pm:${paymentMethod.id}`;
            if (value === excludeValue) return null;
            return (
              <SelectItem key={paymentMethod.id} value={value}>
                {paymentMethod.name}
              </SelectItem>
            );
          })}
        </SelectGroup>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">이체 내역 입력</h2>
      </div>

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
              <Select
                value={form.watch("fromValue")}
                onValueChange={(value) => {
                  form.setValue("fromValue", value, { shouldValidate: true });
                  if (value === form.watch("toValue")) {
                    form.setValue("toValue", "", { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>{renderLocationOptions()}</SelectContent>
              </Select>
              {errors.fromValue && (
                <p className="text-xs text-red-500">
                  {errors.fromValue.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-700">도착지 *</Label>
              <Select
                value={form.watch("toValue")}
                onValueChange={(value) =>
                  form.setValue("toValue", value, { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {renderLocationOptions(fromValue || undefined)}
                </SelectContent>
              </Select>
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
          다음
        </Button>
      </form>
    </div>
  );
}
