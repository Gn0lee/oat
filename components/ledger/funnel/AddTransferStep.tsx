"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LedgerMoneySourceCombobox } from "@/components/ledger/LedgerMoneySourceCombobox";
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
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { TransferItemFormData, TransferLocation } from "@/lib/api/ledger";
import { getKstToday } from "@/lib/date";
import { formatCurrency } from "@/lib/utils/format";

const transferFormSchema = z
  .object({
    amount: z
      .string()
      .min(1, "금액을 입력해주세요.")
      .refine((value) => Number(value) > 0, "0보다 큰 금액을 입력해주세요."),
    title: z.string().min(1, "내용을 입력해주세요."),
    fromValue: z.string().min(1, "어디에서 돈이 나갔는지 선택해주세요."),
    toValue: z.string().min(1, "어디로 돈이 들어갔는지 선택해주세요."),
    transactedAt: z.string().min(1, "날짜를 선택해주세요."),
    memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  })
  .refine((value) => value.fromValue !== value.toValue, {
    path: ["toValue"],
    message: "돈이 나간 곳과 다른 곳을 선택해주세요.",
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface AddTransferStepProps {
  onNext: (item: TransferItemFormData) => void;
  isShared?: boolean;
  defaultDate?: string;
  submitLabel?: string;
}

const today = getKstToday();

function parseLocation(value: string): TransferLocation {
  if (value.startsWith("acc:")) {
    return { kind: "account", id: value.slice(4) };
  }
  return { kind: "paymentMethod", id: value.slice(3) };
}

interface NegativeBalanceWarning {
  locationName: string;
  nextBalance: number;
}

export function AddTransferStep({
  onNext,
  isShared = false,
  defaultDate = today,
  submitLabel = "다음",
}: AddTransferStepProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { userId } = useCurrentUserId();
  const [pendingItem, setPendingItem] = useState<TransferItemFormData | null>(
    null,
  );
  const [negativeBalanceWarning, setNegativeBalanceWarning] =
    useState<NegativeBalanceWarning | null>(null);

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

  const getNegativeBalanceWarning = (
    values: TransferFormValues,
  ): NegativeBalanceWarning | null => {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    if (values.fromValue.startsWith("acc:")) {
      const accountId = values.fromValue.slice(4);
      const account = accounts.find((item) => item.id === accountId);
      if (!account || account.balance === null) return null;
      const nextBalance = account.balance - amount;
      return nextBalance < 0
        ? { locationName: account.name, nextBalance }
        : null;
    }

    if (values.fromValue.startsWith("pm:")) {
      const paymentMethodId = values.fromValue.slice(3);
      const paymentMethod = paymentMethods.find(
        (item) => item.id === paymentMethodId,
      );
      if (!paymentMethod || paymentMethod.balance === null) return null;
      const nextBalance = paymentMethod.balance - amount;
      return nextBalance < 0
        ? { locationName: paymentMethod.name, nextBalance }
        : null;
    }

    return null;
  };

  const submitTransferItem = (item: TransferItemFormData) => {
    setPendingItem(null);
    setNegativeBalanceWarning(null);
    onNext(item);
  };

  const handleSubmit = form.handleSubmit((values) => {
    const item = {
      amount: values.amount,
      title: values.title,
      from: parseLocation(values.fromValue),
      to: parseLocation(values.toValue),
      transactedAt: values.transactedAt,
      memo: values.memo,
    };

    const warning = getNegativeBalanceWarning(values);
    if (warning) {
      setPendingItem(item);
      setNegativeBalanceWarning(warning);
      return;
    }

    submitTransferItem(item);
  });

  const errors = form.formState.errors;

  return (
    <div className="space-y-6">
      <p className="text-gray-500">
        내 계좌, 페이머니, 상품권, 현금 사이에서 돈이 움직인 내역을 기록합니다.
      </p>

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
              placeholder="예: 카카오페이 충전, 증권 계좌 입금"
              {...form.register("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">어디에서 *</Label>
              <LedgerMoneySourceCombobox
                mode="transfer"
                value={form.watch("fromValue")}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                isShared={isShared}
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
              <Label className="text-sm text-gray-700">어디로 *</Label>
              <LedgerMoneySourceCombobox
                mode="transfer"
                value={form.watch("toValue")}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                isShared={isShared}
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
            타인에게 보낸 돈은 내부이체가 아니라 지출로 기록해주세요.
          </p>
        </div>

        <Button type="submit" className="w-full rounded-xl py-3">
          {submitLabel}
        </Button>
      </form>

      <Dialog
        open={Boolean(negativeBalanceWarning && pendingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingItem(null);
            setNegativeBalanceWarning(null);
          }
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
              onClick={() => {
                setPendingItem(null);
                setNegativeBalanceWarning(null);
              }}
            >
              다시 확인
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingItem) submitTransferItem(pendingItem);
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
