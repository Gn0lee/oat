"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ComposerActionBar } from "@/components/composer/ComposerActionBar";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { StockTradeComposerValues } from "@/schemas/stock-trade-composer";

interface SingleTradeDetailsStepProps {
  ownerId: string;
  onSave: () => void;
  isSaving: boolean;
}

/** 거래 1건: 거래일·계좌·메모와 요약을 한 화면에서 받고 바로 저장한다. */
export function SingleTradeDetailsStep({
  ownerId,
  onSave,
  isSaving,
}: SingleTradeDetailsStepProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const item = useWatch({ control: form.control, name: "items.0" });
  if (!item) return null;
  const currency = item.stock?.market === "US" ? "USD" : "KRW";
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  const dateError = form.getFieldState("items.0.transactedAt", form.formState)
    .error?.message;
  const accountError = form.getFieldState("items.0.accountId", form.formState)
    .error?.message;

  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">상세 입력</h1>
      <div className="space-y-1 rounded-[12px] border border-border bg-card p-3 text-foreground">
        <p className="break-words font-medium">
          <span
            className={cn(
              "mr-2",
              item.type === "buy" ? "text-[#F04452]" : "text-[#3182F6]",
            )}
          >
            {item.type === "buy" ? "매수" : "매도"}
          </span>
          {item.stock?.name}
        </p>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {quantity}주 × {formatCurrency(price, currency)}
        </p>
        <p className="text-xl font-semibold [overflow-wrap:anywhere]">
          {formatCurrency(quantity * price, currency)}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade-date-1">거래일</Label>
        <DatePickerInput
          id="trade-date-1"
          aria-label="거래일 1"
          className={composerFieldClassName}
          value={item.transactedAt}
          onChange={(value) => {
            form.setValue("items.0.transactedAt", value ?? "", {
              shouldDirty: true,
            });
            if (value) form.clearErrors("items.0.transactedAt");
          }}
        />
        {dateError && (
          <p role="alert" className="text-sm text-destructive">
            {dateError}
          </p>
        )}
      </div>
      <div id="trade-account-1">
        <AccountSelector
          control={form.control}
          name="items.0.accountId"
          variant="inline"
          placeholder="계좌 선택"
          ownerId={ownerId}
          onChange={(value) => {
            if (value) form.clearErrors("items.0.accountId");
          }}
        />
        {accountError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {accountError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade-memo-1">메모</Label>
        <Textarea
          id="trade-memo-1"
          aria-label="메모 1"
          className={cn(composerFieldClassName, "min-h-20")}
          rows={3}
          maxLength={500}
          placeholder="추가로 남길 내용"
          {...form.register("items.0.memo")}
        />
      </div>
      <ComposerActionBar
        label={isSaving ? "저장 중..." : "저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
