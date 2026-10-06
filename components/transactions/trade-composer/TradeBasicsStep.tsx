"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  type UseFieldArrayReturn,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { ComposerActionBar } from "@/components/composer/ComposerActionBar";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTradeDraft } from "@/lib/stock-trades/composer";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { StockTradeComposerValues } from "@/schemas/stock-trade-composer";
import type { StockMaster } from "@/types";

export const MAX_TRADES = 20;

const TRADE_TYPES = [
  { value: "buy", label: "매수", selectedClassName: "bg-[#F04452] text-white" },
  {
    value: "sell",
    label: "매도",
    selectedClassName: "bg-[#3182F6] text-white",
  },
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function TradeBasicsRow({
  index,
  showNumber,
  onRemove,
}: {
  index: number;
  showNumber: boolean;
  onRemove?: () => void;
}) {
  const form = useFormContext<StockTradeComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const row = index + 1;
  const errorOf = (field: "type" | "stock" | "quantity" | "price") =>
    form.getFieldState(`items.${index}.${field}`, form.formState).error
      ?.message;
  const typeError = errorOf("type");
  const stockError = errorOf("stock");
  const quantityError = errorOf("quantity");
  const priceError = errorOf("price");
  const currency = item?.stock?.market === "US" ? "USD" : "KRW";
  const subtotal = (Number(item?.quantity) || 0) * (Number(item?.price) || 0);
  const quantityPath = `items.${index}.quantity` as const;
  const pricePath = `items.${index}.price` as const;

  return (
    <div className="space-y-5 border-b border-border pb-5">
      {showNumber && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {row}번째 거래
          </p>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              aria-label={`${row}번째 거래 삭제`}
              className="min-h-11"
              onClick={onRemove}
            >
              <Trash2 className="mr-2 size-4" />
              삭제
            </Button>
          )}
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium">매수/매도</p>
        <div
          role="radiogroup"
          aria-label={`매수/매도 ${row}`}
          aria-invalid={Boolean(typeError)}
          aria-describedby={typeError ? `trade-type-error-${row}` : undefined}
          className="grid grid-cols-2 gap-2"
        >
          {TRADE_TYPES.map((option) => {
            const selected = item?.type === option.value;
            return (
              // biome-ignore lint/a11y/useSemanticElements: 버튼형 세그먼트로 매수/매도를 고른다
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  form.setValue(`items.${index}.type`, option.value, {
                    shouldDirty: true,
                  });
                  form.clearErrors(`items.${index}.type`);
                }}
                className={cn(
                  "min-h-11 rounded-[12px] px-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/50",
                  selected
                    ? option.selectedClassName
                    : "border border-foreground/50 bg-card text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <FieldError id={`trade-type-error-${row}`} message={typeError} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">종목</p>
        {/* biome-ignore lint/a11y/useSemanticElements: 종목 검색 트리거를 행 번호로 묶는다 */}
        <div
          role="group"
          aria-label={`종목 ${row}`}
          aria-describedby={stockError ? `trade-stock-error-${row}` : undefined}
        >
          <StockSearchDialog
            value={
              item?.stock
                ? ({
                    code: item.stock.code,
                    name: item.stock.name,
                    market: item.stock.market,
                    exchange: item.stock.exchange,
                  } as StockMaster)
                : null
            }
            onSelect={(stock) => {
              form.setValue(
                `items.${index}.stock`,
                {
                  code: stock.code,
                  name: stock.name,
                  market: stock.market,
                  exchange: stock.exchange ?? null,
                },
                { shouldDirty: true },
              );
              form.clearErrors(`items.${index}.stock`);
            }}
            placeholder="종목 검색"
          />
        </div>
        <FieldError id={`trade-stock-error-${row}`} message={stockError} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`trade-quantity-${row}`}>수량</Label>
          <Input
            id={`trade-quantity-${row}`}
            aria-label={`수량 ${row}`}
            aria-invalid={Boolean(quantityError)}
            aria-describedby={
              quantityError ? `trade-quantity-error-${row}` : undefined
            }
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            className={composerFieldClassName}
            {...form.register(quantityPath, {
              onChange: () => form.clearErrors(quantityPath),
            })}
          />
          <FieldError
            id={`trade-quantity-error-${row}`}
            message={quantityError}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`trade-price-${row}`}>
            {currency === "USD" ? "단가 ($)" : "단가 (원)"}
          </Label>
          <Input
            id={`trade-price-${row}`}
            aria-label={`단가 ${row}`}
            aria-invalid={Boolean(priceError)}
            aria-describedby={
              priceError ? `trade-price-error-${row}` : undefined
            }
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            className={composerFieldClassName}
            {...form.register(pricePath, {
              onChange: () => form.clearErrors(pricePath),
            })}
          />
          <FieldError id={`trade-price-error-${row}`} message={priceError} />
        </div>
      </div>
      {subtotal > 0 && (
        <p className="text-right text-sm text-muted-foreground">
          거래 금액{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(subtotal, currency)}
          </span>
        </p>
      )}
    </div>
  );
}

interface TradeBasicsStepProps {
  itemsArray: UseFieldArrayReturn<StockTradeComposerValues, "items">;
  /** 검토에서 들어오면 그 거래만 보여 주고 행 추가·삭제는 숨긴다. */
  editingClientId?: string;
  onNext: () => void;
}

export function TradeBasicsStep({
  itemsArray,
  editingClientId,
  onNext,
}: TradeBasicsStepProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const { fields, append, remove } = itemsArray;
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const visible = fields
    .map((field, index) => ({ field, index }))
    .filter(
      ({ index }) =>
        !editingClientId || items[index]?.clientId === editingClientId,
    );
  const canEditRows = !editingClientId;

  return (
    <section
      aria-labelledby="trade-basics-heading"
      // 레이아웃이 하단 탭 높이만큼 여백을 주므로, 그 위에 뜨는 고정 액션바 높이만 더 비운다.
      className="flex flex-col gap-5 px-4 pb-14 pt-4"
    >
      <h1 id="trade-basics-heading" className="sr-only">
        거래 내용
      </h1>
      {visible.map(({ field, index }) => (
        <TradeBasicsRow
          key={field.id}
          index={index}
          showNumber={fields.length > 1}
          onRemove={
            canEditRows && fields.length > 1 ? () => remove(index) : undefined
          }
        />
      ))}
      {canEditRows &&
        (fields.length < MAX_TRADES ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full rounded-[12px]"
            onClick={() =>
              // 새 거래는 첫 거래의 거래일·계좌로 시작한다.
              append(
                createTradeDraft({
                  clientId: crypto.randomUUID(),
                  date: items[0]?.transactedAt ?? "",
                  accountId: items[0]?.accountId,
                }),
              )
            }
          >
            <Plus className="mr-2 size-4" />
            종목 추가
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            한 번에 최대 {MAX_TRADES}건까지 입력할 수 있어요.
          </p>
        ))}
      <ComposerActionBar label="다음" onClick={onNext} />
    </section>
  );
}
