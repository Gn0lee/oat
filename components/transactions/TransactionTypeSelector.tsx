"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
import { SegmentedChoiceGroup } from "@/components/layout";
import { Label } from "@/components/ui/label";

interface TransactionTypeSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
  variant?: "card" | "inline";
}

export function TransactionTypeSelector<
  T extends FieldValues & { type: "buy" | "sell" },
>({
  control,
  name = "type" as Path<T>,
  variant = "card",
}: TransactionTypeSelectorProps<T>) {
  const { field } = useController({
    control,
    name,
  });
  const selectedType = field.value as "buy" | "sell";

  const content = (
    <>
      <Label className="text-gray-700">거래 유형</Label>
      <SegmentedChoiceGroup
        value={selectedType}
        onValueChange={(nextValue) => field.onChange(nextValue)}
        columns={2}
        options={[
          {
            value: "buy",
            label: "매수",
            selectedClassName: "bg-[#F04452] text-white",
          },
          {
            value: "sell",
            label: "매도",
            selectedClassName: "bg-[#3182F6] text-white",
          },
        ]}
      />
    </>
  );

  if (variant === "inline") {
    return <div className="space-y-2">{content}</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      {content}
    </div>
  );
}
