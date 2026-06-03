"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { TransactionItemRow } from "@/components/transactions/TransactionItemRow";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";

interface StockComposerFormStepProps {
  index: number;
  mode?: "full" | "daily";
  ownerId: string;
  onBack: () => void;
}

export function StockComposerFormStep({
  index,
  mode = "full",
  ownerId,
  onBack,
}: StockComposerFormStepProps) {
  const form = useFormContext<MultiTransactionFormData>();
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
      <div className="flex-1 overflow-y-auto px-4 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              거래일 및 계좌
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              이 거래 행에 적용할 거래일과 계좌를 변경할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mode === "full" && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">거래일</Label>
                <DatePickerInput
                  value={form.watch(`items.${index}.transactedAt`) ?? ""}
                  onChange={(v) =>
                    form.setValue(`items.${index}.transactedAt`, v || "")
                  }
                  className="h-11 rounded-xl w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <AccountSelector
                control={form.control}
                name={`items.${index}.accountId`}
                variant="inline"
                placeholder="계좌 선택"
                ownerId={ownerId}
              />
            </div>
          </div>
        </div>

        <TransactionItemRow index={index} control={form.control} />

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
