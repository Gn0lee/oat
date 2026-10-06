"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ComposerActionBar } from "@/components/composer/ComposerActionBar";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import type { TradeComposerStep } from "@/lib/stock-trades/composer";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { StockTradeComposerValues } from "@/schemas/stock-trade-composer";
import { MAX_TRADES } from "./TradeBasicsStep";

interface TradeReviewStepProps {
  onEdit: (clientId: string, step: TradeComposerStep, anchorId: string) => void;
  focusId?: string;
  onFocusRestored?: () => void;
  onAdd: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function TradeMemoField({ index }: { index: number }) {
  const form = useFormContext<StockTradeComposerValues>();
  const value =
    useWatch({ control: form.control, name: `items.${index}.memo` }) ?? "";
  return (
    <div className="space-y-2">
      <Label htmlFor={`trade-memo-${index + 1}`}>메모</Label>
      <Textarea
        id={`trade-memo-${index + 1}`}
        aria-label={`메모 ${index + 1}`}
        className={cn(composerFieldClassName, "min-h-20")}
        rows={3}
        maxLength={500}
        placeholder="추가로 남길 내용"
        value={value}
        onChange={(event) =>
          form.setValue(`items.${index}.memo`, event.target.value, {
            shouldDirty: true,
          })
        }
      />
    </div>
  );
}

const reviewRowClassName =
  "h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-0 py-2 text-left";

/** 거래 여러 건: 거래별 카드를 보여 주고, 값을 누르면 그 거래의 단계로 간다. */
export function TradeReviewStep({
  onEdit,
  focusId,
  onFocusRestored,
  onAdd,
  onSave,
  isSaving,
}: TradeReviewStepProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const { data: accounts = [] } = useAccounts();
  const [openMemoIds, setOpenMemoIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    onFocusRestored?.();
  }, [focusId, onFocusRestored]);

  return (
    <section className="space-y-4 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">입력 확인</h1>
      {items.map((item, index) => {
        const row = index + 1;
        const anchor = (field: string) => `review-${item.clientId}-${field}`;
        const currency = item.stock?.market === "US" ? "USD" : "KRW";
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const typeLabel =
          item.type === "buy" ? "매수" : item.type === "sell" ? "매도" : "";
        const stockLabel =
          [typeLabel, item.stock?.name].filter(Boolean).join(" ") ||
          "종목 입력";
        const amountLabel =
          item.quantity && item.price
            ? `${quantity}주 × ${formatCurrency(price, currency)}`
            : "수량·단가 입력";
        const accountName =
          accounts.find((account) => account.id === item.accountId)?.name ??
          "계좌 선택 필요";
        const dateLabel = item.transactedAt || "거래일 선택 필요";
        const isMemoOpen = openMemoIds.has(item.clientId);
        return (
          <article
            key={item.clientId}
            className="space-y-3 border-b border-border pb-4"
          >
            <div className="min-w-0 space-y-1">
              <button
                type="button"
                id={anchor("stock")}
                className="block min-h-11 max-w-full break-words text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`거래 ${row} 종목 수정: ${stockLabel}`}
                onClick={() => onEdit(item.clientId, "basics", anchor("stock"))}
              >
                {typeLabel && (
                  <span
                    className={cn(
                      "mr-2",
                      item.type === "buy" ? "text-[#F04452]" : "text-[#3182F6]",
                    )}
                  >
                    {typeLabel}
                  </span>
                )}
                {item.stock?.name ?? "종목 입력"}
              </button>
              <button
                type="button"
                id={anchor("amount")}
                className="block min-h-11 max-w-full text-left text-sm text-muted-foreground underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`거래 ${row} 수량과 단가 수정: ${amountLabel}`}
                onClick={() =>
                  onEdit(item.clientId, "basics", anchor("amount"))
                }
              >
                {amountLabel}
              </button>
              <p className="text-lg font-semibold [overflow-wrap:anywhere]">
                {formatCurrency(quantity * price, currency)}
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              <Button
                type="button"
                variant="ghost"
                id={anchor("date")}
                className={reviewRowClassName}
                aria-label={`거래 ${row} 거래일 수정: ${dateLabel}`}
                onClick={() => onEdit(item.clientId, "details", anchor("date"))}
              >
                <span className="w-16 shrink-0 text-sm text-muted-foreground">
                  거래일
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {dateLabel}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                id={anchor("account")}
                className={reviewRowClassName}
                aria-label={`거래 ${row} 계좌 수정: ${accountName}`}
                onClick={() =>
                  onEdit(item.clientId, "details", anchor("account"))
                }
              >
                <span className="w-16 shrink-0 text-sm text-muted-foreground">
                  계좌
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {accountName}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Button>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0"
                aria-label={`메모 ${row} ${isMemoOpen ? "접기" : item.memo ? "편집" : "추가"}`}
                aria-expanded={isMemoOpen}
                onClick={() =>
                  setOpenMemoIds((current) => {
                    const next = new Set(current);
                    if (next.has(item.clientId)) next.delete(item.clientId);
                    else next.add(item.clientId);
                    return next;
                  })
                }
              >
                {item.memo ? "메모 편집" : "메모 추가"}
              </Button>
              {!isMemoOpen && item.memo?.trim() && (
                <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                  {item.memo}
                </p>
              )}
              {isMemoOpen && <TradeMemoField index={index} />}
            </div>
          </article>
        );
      })}
      {items.length < MAX_TRADES && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-[12px]"
          onClick={onAdd}
        >
          종목 추가
        </Button>
      )}
      <ComposerActionBar
        label={isSaving ? "저장 중..." : "모두 저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
