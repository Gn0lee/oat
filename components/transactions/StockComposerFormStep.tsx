"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { TransactionItemRow } from "@/components/transactions/TransactionItemRow";
import { Button } from "@/components/ui/button";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";

interface StockComposerFormStepProps {
  index: number;
  onBack: () => void;
}

export function StockComposerFormStep({
  index,
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

  const items = useWatch({ control: form.control, name: "items" });
  const canRemove = items.length > 1;

  const handleRemove = () => {
    const currentItems = form.getValues("items");
    form.setValue(
      "items",
      currentItems.filter((_, i) => i !== index),
    );
    onBack();
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
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <TransactionItemRow
            index={index}
            control={form.control}
            onRemove={handleRemove}
            canRemove={canRemove}
          />
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
