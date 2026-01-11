"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PackagePlusIcon, PlusIcon } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { TransactionItemRow } from "@/components/transactions/TransactionItemRow";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { TransactionTypeSelector } from "@/components/transactions/TransactionTypeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBatchTransactions } from "@/hooks/use-transaction";
import {
  DEFAULT_TRANSACTION_ITEM,
  type MultiTransactionFormData,
  multiTransactionFormSchema,
} from "@/schemas/multi-transaction-form";
import type { CreateBatchTransactionInput } from "@/schemas/transaction";

interface MultiTransactionFormProps {
  defaultDate: string;
  defaultAccountId: string;
}

export function MultiTransactionForm({
  defaultDate,
  defaultAccountId,
}: MultiTransactionFormProps) {
  const createBatchTransactions = useCreateBatchTransactions();

  const form = useForm<MultiTransactionFormData>({
    resolver: zodResolver(multiTransactionFormSchema),
    defaultValues: {
      type: "buy",
      transactedAt: defaultDate,
      accountId: defaultAccountId,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchType = useWatch({ control: form.control, name: "type" });
  const watchItems = useWatch({ control: form.control, name: "items" });

  // 유효한 항목만 필터링 (종목 선택 + 수량 > 0)
  const getValidItems = () => {
    return watchItems.filter(
      (item) => item.stock && item.quantity && Number(item.quantity) > 0,
    );
  };

  const transformToApiInput = (
    data: MultiTransactionFormData,
  ): CreateBatchTransactionInput => {
    const validItems = getValidItems();

    return {
      type: data.type,
      transactedAt: new Date(data.transactedAt).toISOString(),
      accountId: data.accountId,
      items: validItems.map((item) => ({
        ticker: item.stock!.code,
        quantity: Number(item.quantity),
        price: Number(item.price) || 0,
        memo: item.memo || undefined,
        stock: {
          name: item.stock!.name,
          market: item.stock!.market,
          currency:
            item.stock!.market === "US" ? ("USD" as const) : ("KRW" as const),
          assetType: "equity" as const,
        },
      })),
    };
  };

  const onSubmit = async (data: MultiTransactionFormData) => {
    const validItems = getValidItems();

    if (validItems.length === 0) {
      toast.error("최소 1개 이상의 거래를 입력해주세요.");
      return;
    }

    try {
      const input = transformToApiInput(data);
      await createBatchTransactions.mutateAsync(input);

      const typeText = data.type === "buy" ? "매수" : "매도";
      toast.success(
        `${validItems.length}건의 ${typeText} 거래가 등록되었습니다.`,
      );

      // 폼 초기화
      form.reset({
        type: data.type,
        transactedAt: defaultDate,
        accountId: defaultAccountId,
        items: [],
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("거래 등록에 실패했습니다.");
      }
    }
  };

  const handleAddItem = () => {
    append({ ...DEFAULT_TRANSACTION_ITEM });
  };

  const validCount = getValidItems().length;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* 거래 유형 선택 */}
      <TransactionTypeSelector control={form.control} />

      {/* 거래일 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Label className="text-gray-700">거래일</Label>
        <Input
          type="date"
          className="h-12 rounded-xl"
          {...form.register("transactedAt")}
        />
        {form.formState.errors.transactedAt && (
          <p className="text-sm text-destructive">
            {form.formState.errors.transactedAt.message}
          </p>
        )}
      </div>

      {/* 계좌 선택 */}
      <AccountSelector control={form.control} />

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
              아래 버튼을 눌러 거래할 종목을 추가해주세요
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

      {/* 총액 요약 - 종목이 있을 때만 표시 */}
      {fields.length > 0 && (
        <TransactionSummary items={watchItems} type={watchType} />
      )}

      {/* 제출 버튼 - 종목이 있을 때만 표시 */}
      {fields.length > 0 && (
        <Button
          type="submit"
          className="w-full h-14 rounded-xl text-base font-semibold"
          disabled={form.formState.isSubmitting || validCount === 0}
        >
          {form.formState.isSubmitting
            ? "등록 중..."
            : `${watchType === "buy" ? "매수" : "매도"} ${validCount}건 일괄 등록`}
        </Button>
      )}
    </form>
  );
}
