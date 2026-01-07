"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTransaction } from "@/hooks/use-transaction";
import { formatCurrency } from "@/lib/utils/format";
import {
  type TransactionFormData,
  transactionFormSchema,
} from "@/schemas/transaction-form";
import type { CurrencyType, StockMaster } from "@/types";

export function TransactionForm() {
  const [selectedStock, setSelectedStock] = useState<StockMaster | null>(null);

  const createTransaction = useCreateTransaction();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "buy",
      quantity: "",
      price: "",
      transactedAt: new Date().toISOString().split("T")[0],
      memo: "",
    },
  });

  const watchType = watch("type");
  const watchQuantity = watch("quantity");
  const watchPrice = watch("price");

  // 총 거래금액 계산
  const quantity = Number(watchQuantity) || 0;
  const price = Number(watchPrice) || 0;
  const totalAmount = quantity * price;

  // 통화 결정 (종목 선택 전에는 KRW 기본값)
  const currency: CurrencyType = selectedStock?.market === "US" ? "USD" : "KRW";

  const onSubmit = async (data: TransactionFormData) => {
    if (!selectedStock) {
      toast.error("종목을 선택해주세요.");
      return;
    }

    try {
      await createTransaction.mutateAsync({
        ticker: selectedStock.code,
        type: data.type,
        quantity: Number(data.quantity),
        price: Number(data.price),
        transactedAt: new Date(data.transactedAt).toISOString(),
        memo: data.memo || undefined,
        stock: {
          name: selectedStock.name,
          market: selectedStock.market,
          currency: selectedStock.market === "US" ? "USD" : "KRW",
          assetType: "equity",
        },
      });

      // 성공 토스트 표시
      const typeText = data.type === "buy" ? "매수" : "매도";
      toast.success(
        `${selectedStock.name} ${Number(data.quantity).toLocaleString()}주 ${typeText} 등록 완료`,
      );

      // 폼 초기화 (종목은 유지, 수량/가격/메모만 초기화)
      reset({
        type: data.type,
        quantity: "",
        price: "",
        transactedAt: new Date().toISOString().split("T")[0],
        memo: "",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("거래 등록에 실패했습니다.");
      }
    }
  };

  const handleStockSelect = (stock: StockMaster) => {
    setSelectedStock(stock);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 거래 유형 선택 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Label className="text-gray-700">거래 유형</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("type", "buy")}
            className={`h-12 rounded-xl font-medium transition-colors ${
              watchType === "buy"
                ? "bg-[#F04452] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            매수
          </button>
          <button
            type="button"
            onClick={() => setValue("type", "sell")}
            className={`h-12 rounded-xl font-medium transition-colors ${
              watchType === "sell"
                ? "bg-[#3182F6] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            매도
          </button>
        </div>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* 종목 검색 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Label className="text-gray-700">종목</Label>
        <StockSearchDialog
          value={selectedStock}
          onSelect={handleStockSelect}
          placeholder="종목명 또는 코드로 검색"
        />
        {selectedStock && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">
                  {selectedStock.code}
                </span>
                <span className="text-gray-600">{selectedStock.name}</span>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600">
                {selectedStock.exchange}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 수량 및 단가 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-gray-700">
            수량
          </Label>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-12 rounded-xl text-right text-lg"
            aria-invalid={!!errors.quantity}
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">
              {errors.quantity.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price" className="text-gray-700">
            거래 단가
          </Label>
          <div className="relative">
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              placeholder="0"
              className="h-12 rounded-xl text-right text-lg pr-12"
              aria-invalid={!!errors.price}
              {...register("price")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              {currency === "KRW" ? "원" : "$"}
            </span>
          </div>
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        {/* 총 거래금액 */}
        {totalAmount > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">총 거래금액</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 거래일 및 메모 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transactedAt" className="text-gray-700">
            거래일
          </Label>
          <Input
            id="transactedAt"
            type="date"
            className="h-12 rounded-xl"
            aria-invalid={!!errors.transactedAt}
            {...register("transactedAt")}
          />
          {errors.transactedAt && (
            <p className="text-sm text-destructive">
              {errors.transactedAt.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo" className="text-gray-700">
            메모 <span className="text-gray-400 font-normal">(선택)</span>
          </Label>
          <Input
            id="memo"
            type="text"
            placeholder="거래에 대한 메모를 입력하세요"
            className="h-12 rounded-xl"
            aria-invalid={!!errors.memo}
            {...register("memo")}
          />
          {errors.memo && (
            <p className="text-sm text-destructive">{errors.memo.message}</p>
          )}
        </div>
      </div>

      {/* 제출 버튼 */}
      <Button
        type="submit"
        className="w-full h-14 rounded-xl text-base font-semibold"
        disabled={isSubmitting || !selectedStock}
      >
        {isSubmitting
          ? "등록 중..."
          : `${watchType === "buy" ? "매수" : "매도"} 등록`}
      </Button>
    </form>
  );
}
