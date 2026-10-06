"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  getLedgerMoneySourceLabel,
  LedgerMoneySourceCombobox,
  LedgerMoneySourcePickerPanel,
  LedgerMoneySourceTrigger,
} from "@/components/ledger/LedgerMoneySourceCombobox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ledgerFieldClassName } from "./field-styles";

type Picker = "source" | "from" | "to" | null;
export function EntryMoneySourceFields({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [picker, setPicker] = useState<Picker>(null);
  const previousPicker = useRef<Picker>(null);
  const triggerRefs = useRef<
    Record<Exclude<Picker, null>, HTMLButtonElement | null>
  >({ source: null, from: null, to: null });
  const { data: books = [] } = useLedgerBooks();
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { userId } = useCurrentUserId();

  // 모바일 드로어는 검색창에 자동 포커스하지 않는다. 키보드는 사용자가 검색창을 탭할 때만 올라온다.
  useEffect(() => {
    if (!picker && previousPicker.current) {
      triggerRefs.current[previousPicker.current]?.focus();
    }
    previousPicker.current = picker;
  }, [picker]);

  if (!item) return null;
  const book = books.find((candidate) => candidate.id === item.bookId);
  const isShared = book?.visibility === "shared";
  const row = index + 1;
  const paymentValue = item.paymentMethodId
    ? `pm:${item.paymentMethodId}`
    : item.accountId
      ? `acc:${item.accountId}`
      : "";
  const fromValue = item.fromValue ?? "";
  const toValue = item.toValue ?? "";
  const sourceMode = item.type === "income" ? "income" : "expense";
  const sourceLabel =
    item.type === "income"
      ? `입금 계좌 ${row}`
      : item.type === "non_expense_withdrawal"
        ? `출금처 ${row}`
        : `결제 방법 ${row}`;
  const sourcePlaceholder =
    item.type === "non_expense_withdrawal" ? "선택" : "선택 안함";
  const fromError = form.getFieldState(
    `items.${index}.fromValue`,
    form.formState,
  ).error?.message;
  const toError = form.getFieldState(`items.${index}.toValue`, form.formState)
    .error?.message;
  const sourceError =
    item.type === "income"
      ? form.getFieldState(`items.${index}.accountId`, form.formState).error
          ?.message
      : item.type === "non_expense_withdrawal"
        ? (form.getFieldState(`items.${index}.accountId`, form.formState).error
            ?.message ??
          form.getFieldState(`items.${index}.paymentMethodId`, form.formState)
            .error?.message)
        : form.getFieldState(`items.${index}.paymentMethodId`, form.formState)
            .error?.message;

  const setSource = (value: string, field: "source" | "from" | "to") => {
    const options = { shouldDirty: true, shouldValidate: true };
    if (field === "from" || field === "to") {
      form.setValue(
        `items.${index}.${field === "from" ? "fromValue" : "toValue"}`,
        value,
        options,
      );
      if (field === "from" && value === toValue)
        form.setValue(`items.${index}.toValue`, "", options);
      return;
    }
    form.setValue(
      `items.${index}.paymentMethodId`,
      value.startsWith("pm:") ? value.slice(3) : undefined,
      options,
    );
    form.setValue(
      `items.${index}.accountId`,
      value.startsWith("acc:") ? value.slice(4) : undefined,
      options,
    );
  };

  if (item.type !== "transfer") {
    return (
      <div className="space-y-2">
        <Label>
          {item.type === "income"
            ? "입금 계좌"
            : item.type === "non_expense_withdrawal"
              ? "출금처"
              : "결제 방법"}
        </Label>
        {isDesktop ? (
          <LedgerMoneySourceCombobox
            mode={sourceMode}
            value={paymentValue}
            paymentMethods={paymentMethods}
            accounts={accounts}
            ownerId={userId}
            isShared={isShared}
            placeholder={sourcePlaceholder}
            className={ledgerFieldClassName}
            aria-label={sourceLabel}
            onValueChange={(value) => setSource(value, "source")}
          />
        ) : (
          <>
            <LedgerMoneySourceTrigger
              ref={(node) => {
                triggerRefs.current.source = node;
              }}
              className={ledgerFieldClassName}
              aria-label={sourceLabel}
              aria-invalid={Boolean(sourceError)}
              aria-describedby={sourceError ? `source-error-${row}` : undefined}
              label={getLedgerMoneySourceLabel({
                mode: sourceMode,
                value: paymentValue,
                paymentMethods,
                accounts,
                ownerId: userId,
                isShared,
                placeholder: sourcePlaceholder,
              })}
              placeholder={sourcePlaceholder}
              onClick={() => setPicker("source")}
            />
            <Drawer
              open={picker === "source"}
              onOpenChange={(open) => !open && setPicker(null)}
            >
              <DrawerContent
                className="h-[85dvh] max-h-[85dvh] p-0"
                showHandle={false}
              >
                <DrawerTitle className="sr-only">
                  {sourceLabel} 선택
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  검색하거나 목록에서 금융수단을 선택하세요.
                </DrawerDescription>
                <LedgerMoneySourcePickerPanel
                  mode={sourceMode}
                  value={paymentValue}
                  paymentMethods={paymentMethods}
                  accounts={accounts}
                  ownerId={userId}
                  isShared={isShared}
                  title={sourceLabel}
                  searchPlaceholder="이름, 기관, 소유자 검색"
                  onBack={() => setPicker(null)}
                  onValueChange={(value) => {
                    setSource(value, "source");
                    setPicker(null);
                  }}
                />
              </DrawerContent>
            </Drawer>
          </>
        )}
        {sourceError && (
          <p
            id={`source-error-${row}`}
            role="alert"
            className="text-sm text-destructive"
          >
            {sourceError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {(["from", "to"] as const).map((field) => {
        const value = field === "from" ? fromValue : toValue;
        const fieldError = field === "from" ? fromError : toError;
        const name = field === "from" ? `출발지 ${row}` : `도착지 ${row}`;
        const excludedValues =
          field === "from"
            ? toValue
              ? [toValue]
              : []
            : fromValue
              ? [fromValue]
              : [];
        return (
          <div key={field} className="space-y-2">
            <Label>{field === "from" ? "어디에서" : "어디로"}</Label>
            {isDesktop ? (
              <LedgerMoneySourceCombobox
                mode="transfer"
                value={value}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                isShared={isShared}
                includeClearOption={false}
                excludedValues={excludedValues}
                placeholder="선택"
                className={ledgerFieldClassName}
                aria-label={name}
                onValueChange={(next) => setSource(next, field)}
              />
            ) : (
              <>
                <LedgerMoneySourceTrigger
                  ref={(node) => {
                    triggerRefs.current[field] = node;
                  }}
                  className={ledgerFieldClassName}
                  aria-label={name}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={
                    fieldError ? `${field}-error-${row}` : undefined
                  }
                  label={getLedgerMoneySourceLabel({
                    mode: "transfer",
                    value,
                    paymentMethods,
                    accounts,
                    ownerId: userId,
                    isShared,
                    placeholder: "선택",
                  })}
                  placeholder="선택"
                  onClick={() => setPicker(field)}
                />
                <Drawer
                  open={picker === field}
                  onOpenChange={(open) => !open && setPicker(null)}
                >
                  <DrawerContent
                    className="h-[85dvh] max-h-[85dvh] p-0"
                    showHandle={false}
                  >
                    <DrawerTitle className="sr-only">{name} 선택</DrawerTitle>
                    <DrawerDescription className="sr-only">
                      검색하거나 목록에서 금융수단을 선택하세요.
                    </DrawerDescription>
                    <LedgerMoneySourcePickerPanel
                      mode="transfer"
                      value={value}
                      paymentMethods={paymentMethods}
                      accounts={accounts}
                      ownerId={userId}
                      isShared={isShared}
                      includeClearOption={false}
                      excludedValues={excludedValues}
                      title={field === "from" ? "어디에서" : "어디로"}
                      searchPlaceholder="계좌, 페이머니, 상품권, 현금 검색"
                      onBack={() => setPicker(null)}
                      onValueChange={(next) => {
                        setSource(next, field);
                        setPicker(null);
                      }}
                    />
                  </DrawerContent>
                </Drawer>
              </>
            )}
            {fieldError && (
              <p
                id={`${field}-error-${row}`}
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldError}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
