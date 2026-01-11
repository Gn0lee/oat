"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  PackagePlusIcon,
  PlusIcon,
} from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { TransactionItemRow } from "@/components/transactions/TransactionItemRow";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_TRANSACTION_ITEM,
  type TransactionItemFormData,
  transactionItemSchema,
} from "@/schemas/multi-transaction-form";

const addItemsFormSchema = z.object({
  items: z
    .array(transactionItemSchema)
    .min(1, "최소 1개 이상의 종목을 입력해주세요."),
});

type AddItemsFormData = z.infer<typeof addItemsFormSchema>;

interface AddItemsStepProps {
  type: "buy" | "sell";
  onNext: (items: TransactionItemFormData[]) => void;
  onBack: () => void;
}

export function AddItemsStep({ type, onNext, onBack }: AddItemsStepProps) {
  const form = useForm<AddItemsFormData>({
    resolver: zodResolver(addItemsFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = useWatch({ control: form.control, name: "items" });

  const typeText = type === "buy" ? "매수" : "매도";
  const typeColor = type === "buy" ? "text-red-600" : "text-blue-600";

  const handleAddItem = () => {
    append({ ...DEFAULT_TRANSACTION_ITEM });
  };

  const getValidItems = () => {
    return watchItems.filter(
      (item) => item.stock && item.quantity && Number(item.quantity) > 0,
    );
  };

  const validCount = getValidItems().length;

  const handleNext = () => {
    if (validCount === 0) return;
    onNext(watchItems);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <span className={`text-sm font-medium ${typeColor}`}>{typeText}</span>
          <h2 className="text-xl font-bold text-gray-900">종목 입력</h2>
        </div>
      </div>

      {/* 종목 행 목록 */}
      {fields.length === 0 ? (
        /* 빈 상태 UI */
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <PackagePlusIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-900 font-medium">등록할 종목이 없습니다</p>
            <p className="text-gray-500 text-sm">
              아래 버튼을 눌러 {typeText}할 종목을 추가해주세요
            </p>
          </div>
          <Button type="button" onClick={handleAddItem} className="mt-2">
            <PlusIcon className="h-4 w-4 mr-2" />첫 번째 종목 추가
          </Button>
        </div>
      ) : (
        <>
          {/* 인라인 행 컨테이너 */}
          <div className="bg-white rounded-2xl shadow-sm px-4">
            {fields.map((field, index) => (
              <TransactionItemRow
                key={field.id}
                index={index}
                control={form.control}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            ))}
          </div>

          {/* 종목 추가 버튼 */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="w-full h-12 rounded-xl border-dashed"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            종목 추가
          </Button>
        </>
      )}

      {/* 총액 요약 */}
      {fields.length > 0 && (
        <TransactionSummary items={watchItems} type={type} />
      )}

      {/* 다음 버튼 */}
      {fields.length > 0 && (
        <Button
          onClick={handleNext}
          disabled={validCount === 0}
          className="w-full h-14 rounded-xl text-base font-semibold"
        >
          {validCount}건 확인하기
          <ChevronRightIcon className="w-5 h-5 ml-1" />
        </Button>
      )}
    </div>
  );
}
