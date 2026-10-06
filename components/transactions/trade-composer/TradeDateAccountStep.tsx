"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ComposerActionBar } from "@/components/composer/ComposerActionBar";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { StockTradeComposerValues } from "@/schemas/stock-trade-composer";

interface TradeDateAccountStepProps {
  /** 검토에서 들어오면 그 거래의 거래일·계좌만 고친다. 없으면 모든 거래에 적용할 값을 받는다. */
  clientId?: string;
  ownerId: string;
  onNext: () => void;
}

/**
 * 거래 여러 건: 거래일 하나와 계좌 하나를 정한다.
 * 모든 거래에 적용할 값은 첫 거래 칸에 받고, 다음을 누르면 나머지 거래에 써 넣는다.
 */
export function TradeDateAccountStep({
  clientId,
  ownerId,
  onNext,
}: TradeDateAccountStepProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const index = clientId
    ? items.findIndex((item) => item.clientId === clientId)
    : 0;
  const item = items[index];
  if (!item) return null;
  const row = index + 1;
  const datePath = `items.${index}.transactedAt` as const;
  const accountPath = `items.${index}.accountId` as const;
  const dateError = form.getFieldState(datePath, form.formState).error?.message;
  const accountError = form.getFieldState(accountPath, form.formState).error
    ?.message;

  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">거래일과 계좌</h1>
      {clientId ? (
        <p className="break-words text-sm text-muted-foreground">
          <span
            className={cn(
              "mr-2 font-medium",
              item.type === "buy" ? "text-[#F04452]" : "text-[#3182F6]",
            )}
          >
            {item.type === "buy" ? "매수" : item.type === "sell" ? "매도" : ""}
          </span>
          {item.stock?.name}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          거래 {items.length}건에 모두 적용돼요. 다른 거래일이나 계좌는 다음
          화면에서 거래별로 바꿀 수 있어요.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor={`trade-date-${row}`}>거래일</Label>
        <DatePickerInput
          id={`trade-date-${row}`}
          aria-label={`거래일 ${row}`}
          className={composerFieldClassName}
          value={item.transactedAt}
          onChange={(value) => {
            form.setValue(datePath, value ?? "", { shouldDirty: true });
            if (value) form.clearErrors(datePath);
          }}
        />
        {dateError && (
          <p role="alert" className="text-sm text-destructive">
            {dateError}
          </p>
        )}
      </div>
      <div id={`trade-account-${row}`}>
        <AccountSelector
          key={accountPath}
          control={form.control}
          name={accountPath}
          variant="inline"
          placeholder="계좌 선택"
          ownerId={ownerId}
          onChange={(value) => {
            if (value) form.clearErrors(accountPath);
          }}
        />
        {accountError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {accountError}
          </p>
        )}
      </div>
      <ComposerActionBar label="입력 확인" onClick={onNext} />
    </section>
  );
}
