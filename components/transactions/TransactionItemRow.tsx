"use client";

import { Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";
import type { CurrencyType, StockMaster } from "@/types";

// items 배열을 포함하는 폼 타입 제약
type FormWithItems = FieldValues & { items: TransactionItemFormData[] };

interface TransactionItemRowProps<T extends FormWithItems> {
  index: number;
  control: Control<T>;
  onRemove: () => void;
  canRemove: boolean;
}

export function TransactionItemRow<T extends FormWithItems>({
  index,
  control,
  onRemove,
  canRemove,
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
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      {/* 1줄: 종목 + 삭제 */}
      <div className="flex items-center gap-2 mb-3">
        {/* 종목 검색 */}
        <div className="flex-1">
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

        {/* 삭제 버튼 */}
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-9 w-9 text-gray-400 hover:text-red-500 shrink-0"
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 2줄: 수량 + 단가 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-gray-500 shrink-0">수량</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-9 text-right text-sm"
            {...control.register(`items.${index}.quantity` as FieldPath<T>)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-gray-500 shrink-0">
            {currency === "KRW" ? "단가" : "$"}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="h-9 text-right text-sm"
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
