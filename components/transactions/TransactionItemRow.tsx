"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";
import type { CurrencyType, StockMaster } from "@/types";

// items 배열을 포함하는 폼 타입 제약
type FormWithItems = FieldValues & { items: TransactionItemFormData[] };

interface TransactionItemRowProps<T extends FormWithItems> {
  index: number;
  control: Control<T>;
  onRemove?: () => void;
  canRemove?: boolean;
  prominent?: boolean;
}

export function TransactionItemRow<T extends FormWithItems>({
  index,
  control,
  onRemove,
  canRemove = false,
  prominent = false,
}: TransactionItemRowProps<T>) {
  const stockController = useController({
    control,
    name: `items.${index}.stock` as FieldPath<T>,
  });
  const { field: stockField, fieldState: stockState } = stockController;

  const quantityController = useController({
    control,
    name: `items.${index}.quantity` as FieldPath<T>,
  });
  const priceController = useController({
    control,
    name: `items.${index}.price` as FieldPath<T>,
  });
  const { field: quantityField, fieldState: quantityState } =
    quantityController;
  const { field: priceField, fieldState: priceState } = priceController;
  const quantity = quantityField.value;
  const price = priceField.value;
  const stockErrorId = `item-${index}-stock-error`;
  const quantityId = `item-${index}-quantity`;
  const quantityErrorId = `item-${index}-quantity-error`;
  const priceId = `item-${index}-price`;
  const priceErrorId = `item-${index}-price-error`;

  // 소계 계산
  const subtotal = useMemo(() => {
    const qty = Number(quantity) || 0;
    const prc = Number(price) || 0;
    return qty * prc;
  }, [quantity, price]);

  // 통화 결정
  const currency: CurrencyType =
    stockField.value?.market === "US" ? "USD" : "KRW";

  const handleStockSelect = (stock: StockMaster) => {
    stockField.onChange({
      code: stock.code,
      name: stock.name,
      market: stock.market,
      exchange: stock.exchange ?? null,
    });
  };

  return (
    <div className="py-2 space-y-4">
      {/* 1줄: 종목 */}
      <fieldset
        className="space-y-1"
        aria-invalid={stockState.invalid}
        aria-describedby={stockState.error ? stockErrorId : undefined}
      >
        <legend className="text-sm font-medium text-gray-700">종목 *</legend>
        <div className="flex items-center justify-between">
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              aria-label="종목 삭제"
              className="size-11 text-gray-400 hover:text-red-500 shrink-0"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
        <StockSearchDialog
          value={
            stockField.value
              ? ({
                  code: stockField.value.code,
                  name: stockField.value.name,
                  market: stockField.value.market,
                  exchange: stockField.value.exchange,
                } as StockMaster)
              : null
          }
          onSelect={handleStockSelect}
          placeholder="종목 검색"
        />
        {stockState.error && (
          <p id={stockErrorId} className="text-sm text-destructive">
            {stockState.error.message}
          </p>
        )}
      </fieldset>

      {/* 2줄: 수량 + 단가 */}
      <div className={cn("grid grid-cols-2 gap-3", prominent && "grid-cols-1")}>
        <div className="space-y-1">
          <Label htmlFor={quantityId} className="text-sm text-gray-700">
            수량 *
          </Label>
          <Input
            id={quantityId}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            aria-invalid={quantityState.invalid}
            aria-describedby={quantityState.error ? quantityErrorId : undefined}
            className={cn(
              "h-11 rounded-xl",
              prominent ? "h-14 text-2xl md:text-2xl" : "text-base md:text-sm",
            )}
            {...quantityField}
          />
          {quantityState.error && (
            <p id={quantityErrorId} className="text-sm text-destructive">
              {quantityState.error.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={priceId} className="text-sm text-gray-700">
            {currency === "KRW" ? "단가 (원) *" : "단가 ($) *"}
          </Label>
          <Input
            id={priceId}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            aria-invalid={priceState.invalid}
            aria-describedby={priceState.error ? priceErrorId : undefined}
            className={cn(
              "h-11 rounded-xl",
              prominent ? "h-14 text-2xl md:text-2xl" : "text-base md:text-sm",
            )}
            {...priceField}
          />
          {priceState.error && (
            <p id={priceErrorId} className="text-sm text-destructive">
              {priceState.error.message}
            </p>
          )}
        </div>
      </div>

      {/* 3줄: 소계 */}
      {subtotal > 0 && (
        <div className="mt-2 text-right">
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(subtotal, currency)}
          </span>
        </div>
      )}
    </div>
  );
}
