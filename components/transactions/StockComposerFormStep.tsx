"use client";

import { ArrowLeftIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { TransactionItemRow } from "@/components/transactions/TransactionItemRow";
import { TransactionTypeSelector } from "@/components/transactions/TransactionTypeSelector";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils/format";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";

interface StockComposerFormStepProps {
  index: number;
  mode?: "full" | "daily";
  ownerId: string;
  onBack: () => void;
  onCancel: () => void;
  isMobile?: boolean;
}

export function StockComposerFormStep({
  index,
  mode = "full",
  ownerId,
  onBack,
  onCancel,
  isMobile = false,
}: StockComposerFormStepProps) {
  const form = useFormContext<MultiTransactionFormData>();
  const [stage, setStage] = useState<1 | 2>(1);
  const [showDetailsErrors, setShowDetailsErrors] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef<1 | 2 | null>(null);
  useEffect(() => {
    if (isMobile && previousStage.current !== stage) {
      headingRef.current?.focus({ preventScroll: true });
      previousStage.current = stage;
    }
  }, [stage, isMobile]);
  const item = form.watch(`items.${index}`);
  const typeText = form.watch("type") === "buy" ? "매수" : "매도";
  const date = item?.transactedAt || form.watch("transactedAt");
  const accountId = item?.accountId || form.watch("accountId");
  const currency = item?.stock?.market === "US" ? "USD" : "KRW";
  const subtotal = (Number(item?.quantity) || 0) * (Number(item?.price) || 0);
  const dateMissing = showDetailsErrors && !date;
  const accountMissing = showDetailsErrors && !accountId;

  const handleNext = async () => {
    const valid = await form.trigger(
      [
        `items.${index}.stock`,
        `items.${index}.quantity`,
        `items.${index}.price`,
      ],
      { shouldFocus: true },
    );
    if (valid) setStage(2);
  };

  const handleConfirm = async () => {
    setShowDetailsErrors(true);
    const valid = await form.trigger(`items.${index}`, { shouldFocus: true });
    if (!date) {
      document.getElementById(`stock-date-${index}`)?.focus();
    } else if (!accountId) {
      document
        .getElementById(`stock-account-${index}`)
        ?.querySelector("button")
        ?.focus();
    }
    if (valid && date && accountId) onBack();
  };

  const dateAndAccount = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(isMobile || mode === "full") && (
        <div className="space-y-2">
          <Label
            htmlFor={`stock-date-${index}`}
            className="text-sm text-gray-700"
          >
            거래일
          </Label>
          <DatePickerInput
            id={`stock-date-${index}`}
            value={date ?? ""}
            onChange={(value) =>
              form.setValue(`items.${index}.transactedAt`, value || "", {
                shouldValidate: true,
              })
            }
            className="h-11 w-full rounded-xl"
          />
          {dateMissing && (
            <p
              id={`stock-date-error-${index}`}
              className="text-sm text-destructive"
            >
              거래일을 선택해주세요.
            </p>
          )}
        </div>
      )}
      <div id={`stock-account-${index}`}>
        <AccountSelector
          control={form.control}
          name={`items.${index}.accountId`}
          variant="inline"
          placeholder="계좌 선택"
          ownerId={ownerId}
        />
        {accountMissing && (
          <p
            id={`stock-account-error-${index}`}
            className="text-sm text-destructive"
          >
            계좌를 선택해주세요.
          </p>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <header className="flex shrink-0 items-center gap-2 border-b px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label={stage === 1 ? "종목 목록으로" : "핵심 입력으로"}
            onClick={stage === 1 ? onCancel : () => setStage(1)}
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-base font-semibold"
            >
              {stage === 1 ? "거래 입력" : `${typeText} 거래 확인`}
            </h2>
            <p className="text-xs text-gray-500">{stage}/2</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="입력 취소"
            onClick={onCancel}
          >
            <XIcon className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {stage === 1 ? (
            <>
              <TransactionTypeSelector
                control={form.control}
                variant="inline"
              />
              {form.getValues("items").length > 1 && (
                <p className="text-xs text-gray-500">모든 종목에 적용됩니다.</p>
              )}
              <div className="border-t pt-4">
                <TransactionItemRow
                  index={index}
                  control={form.control}
                  prominent
                />
              </div>
            </>
          ) : (
            <>
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  거래 정보
                </h3>
                {dateAndAccount}
                <div className="space-y-2">
                  <Label htmlFor={`stock-memo-${index}`}>메모 (선택)</Label>
                  <Textarea
                    id={`stock-memo-${index}`}
                    maxLength={500}
                    aria-invalid={!!form.formState.errors.items?.[index]?.memo}
                    aria-describedby={
                      form.formState.errors.items?.[index]?.memo
                        ? `stock-memo-error-${index}`
                        : undefined
                    }
                    {...form.register(`items.${index}.memo`)}
                  />
                  {form.formState.errors.items?.[index]?.memo && (
                    <p
                      id={`stock-memo-error-${index}`}
                      className="text-sm text-destructive"
                    >
                      {form.formState.errors.items[index]?.memo?.message}
                    </p>
                  )}
                </div>
              </section>
              <section
                className="space-y-3 border-t pt-5"
                aria-label="저장 전 확인"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  저장 전 확인
                </h3>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">종목</span>
                  <span className="min-w-0 text-right font-medium break-words">
                    {item?.stock?.name}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">수량 · 단가</span>
                  <span className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
                    {item?.quantity}주 ·{" "}
                    {formatCurrency(Number(item?.price), currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-3">
                  <span className="text-sm text-gray-500">거래 금액</span>
                  <strong className="min-w-0 text-right text-xl [overflow-wrap:anywhere]">
                    {formatCurrency(subtotal, currency)}
                  </strong>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={stage === 1 ? handleNext : handleConfirm}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {stage === 1 ? "다음" : "입력 완료"}
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label="입력 취소"
        onClick={onCancel}
        className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
      >
        <XIcon className="size-5" />
      </Button>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              거래일 및 계좌
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              이 거래 행에 적용할 거래일과 계좌를 변경할 수 있습니다.
            </p>
          </div>
          {dateAndAccount}
        </div>
        <TransactionItemRow index={index} control={form.control} />
        <Button
          type="button"
          onClick={handleConfirm}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          완료
        </Button>
      </div>
    </>
  );
}
