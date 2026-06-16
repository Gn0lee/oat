"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function TransactionItemRow<T extends FormWithItems>({
  index,
  control,
  onRemove,
  canRemove = false,
}: TransactionItemRowProps<T>) {
  const { field: stockField } = useController({
    control,
    name: `items.${index}.stock` as FieldPath<T>,
  });

  const quantity = useWatch({
    control,
    name: `items.${index}.quantity` as FieldPath<T>,
  });
  const price = useWatch({
    control,
    name: `items.${index}.price` as FieldPath<T>,
  });

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
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-700">종목 *</Label>
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0"
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
      </div>

      {/* 2줄: 수량 + 단가 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm text-gray-700">수량 *</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-11 rounded-xl text-sm"
            {...control.register(`items.${index}.quantity` as FieldPath<T>)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-gray-700">
            {currency === "KRW" ? "단가 (원) *" : "단가 ($) *"}
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="h-11 rounded-xl text-sm"
            {...control.register(`items.${index}.price` as FieldPath<T>)}
          />
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
