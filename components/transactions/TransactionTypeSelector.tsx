"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
import { Label } from "@/components/ui/label";

interface TransactionTypeSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
}

export function TransactionTypeSelector<
  T extends FieldValues & { type: "buy" | "sell" },
>({ control, name = "type" as Path<T> }: TransactionTypeSelectorProps<T>) {
  const { field } = useController({
    control,
    name,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <Label className="text-gray-700">거래 유형</Label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => field.onChange("buy")}
          className={`h-12 rounded-xl font-medium transition-colors ${
            field.value === "buy"
              ? "bg-[#F04452] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          매수
        </button>
        <button
          type="button"
          onClick={() => field.onChange("sell")}
          className={`h-12 rounded-xl font-medium transition-colors ${
            field.value === "sell"
              ? "bg-[#3182F6] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          매도
        </button>
      </div>
    </div>
  );
}
