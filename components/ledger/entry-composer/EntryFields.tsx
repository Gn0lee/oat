"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  LedgerCategoryPickerPanel,
  LedgerCategoryTrigger,
} from "@/components/ledger/LedgerCategoryCombobox";
import {
  getLedgerMoneySourceLabel,
  LedgerMoneySourcePickerPanel,
  LedgerMoneySourceTrigger,
} from "@/components/ledger/LedgerMoneySourceCombobox";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { normalizeComposerTypeChange } from "@/lib/ledger/composer";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";

type FieldSection = "classification" | "sources" | "datesBooks" | "memo";
type Picker = "category" | "source" | "from" | "to" | null;

export function EntryFields({
  index,
  sections,
  showType = false,
}: {
  index: number;
  sections: FieldSection[];
  showType?: boolean;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const [picker, setPicker] = useState<Picker>(null);
  const previousPicker = useRef<Picker>(null);
  const triggerRefs = useRef<
    Record<Exclude<Picker, null>, HTMLButtonElement | null>
  >({ category: null, source: null, from: null, to: null });
  const { data: books = [] } = useLedgerBooks();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: accounts = [] } = useAccounts();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { userId } = useCurrentUserId();
  useEffect(() => {
    if (picker) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('[data-slot="command-input"]')
          ?.focus(),
      );
    } else if (previousPicker.current) {
      triggerRefs.current[previousPicker.current]?.focus();
    }
    previousPicker.current = picker;
  }, [picker]);

  if (!item) return null;
  const book = books.find((candidate) => candidate.id === item.bookId);
  const isShared = book?.visibility === "shared";
  const categoryType =
    item.type === "expense" || item.type === "income" ? item.type : undefined;
  const categories =
    item.type === "income" ? incomeCategories : expenseCategories;
  const category = categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  const sourceValue = item.paymentMethodId
    ? `pm:${item.paymentMethodId}`
    : item.accountId
      ? `acc:${item.accountId}`
      : "";
  const fromValue = item.fromValue ?? "";
  const toValue = item.toValue ?? "";
  const setSource = (value: string, field: "source" | "from" | "to") => {
    if (field === "from" || field === "to") {
      form.setValue(
        `items.${index}.${field === "from" ? "fromValue" : "toValue"}`,
        value,
        { shouldValidate: true },
      );
      if (field === "from" && value === toValue)
        form.setValue(`items.${index}.toValue`, "", { shouldValidate: true });
      return;
    }
    form.setValue(
      `items.${index}.paymentMethodId`,
      value.startsWith("pm:") ? value.slice(3) : undefined,
      { shouldValidate: true },
    );
    form.setValue(
      `items.${index}.accountId`,
      value.startsWith("acc:") ? value.slice(4) : undefined,
      { shouldValidate: true },
    );
  };
  const sourceMode =
    item.type === "non_expense_withdrawal"
      ? "expense"
      : item.type === "income"
        ? "income"
        : "expense";
  const categoryError = form.getFieldState(
    `items.${index}.categoryId`,
    form.formState,
  ).error?.message;
  const fromError = form.getFieldState(
    `items.${index}.fromValue`,
    form.formState,
  ).error?.message;
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
  const rowNumber = index + 1;

  return (
    <div className="space-y-5">
      {showType && (
        <div className="space-y-2">
          <Label>유형</Label>
          <Select
            value={item.type}
            onValueChange={(value) => {
              const next = form.getValues(`items.${index}`);
              form.setValue(
                `items.${index}`,
                normalizeComposerTypeChange(next, value as typeof item.type),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          >
            <SelectTrigger
              className="min-h-11"
              aria-label={`기록 유형 ${index + 1}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">지출</SelectItem>
              <SelectItem value="income">수입</SelectItem>
              <SelectItem value="transfer">내부이체</SelectItem>
              <SelectItem value="non_expense_withdrawal">
                비지출 출금
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {sections.includes("classification") && categoryType && (
        <div className="space-y-2">
          <Label>카테고리</Label>
          <LedgerCategoryTrigger
            ref={(node) => {
              triggerRefs.current.category = node;
            }}
            className="min-h-11"
            aria-label={`카테고리 ${rowNumber}`}
            aria-invalid={Boolean(categoryError)}
            aria-describedby={
              categoryError ? `category-error-${rowNumber}` : undefined
            }
            label={category?.name ?? "선택"}
            placeholder="카테고리 선택"
            onClick={() => setPicker("category")}
          />
          {categoryError && (
            <p
              id={`category-error-${rowNumber}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {categoryError}
            </p>
          )}
          <Drawer
            open={picker === "category"}
            onOpenChange={(open) => !open && setPicker(null)}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0"
              showHandle={false}
            >
              <DrawerTitle className="sr-only">카테고리 선택</DrawerTitle>
              <DrawerDescription className="sr-only">
                검색하거나 목록에서 카테고리를 선택하세요.
              </DrawerDescription>
              <LedgerCategoryPickerPanel
                value={item.categoryId ?? ""}
                categories={categories}
                type={categoryType}
                title="카테고리 선택"
                searchPlaceholder="카테고리 이름 검색"
                onBack={() => setPicker(null)}
                onValueChange={(value) => {
                  form.setValue(`items.${index}.categoryId`, value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setPicker(null);
                }}
              />
            </DrawerContent>
          </Drawer>
        </div>
      )}

      {sections.includes("sources") && item.type !== "transfer" && (
        <div className="space-y-2">
          <Label>
            {item.type === "non_expense_withdrawal"
              ? "출금처"
              : item.type === "income"
                ? "입금 계좌"
                : "결제 방법"}
          </Label>
          <LedgerMoneySourceTrigger
            ref={(node) => {
              triggerRefs.current.source = node;
            }}
            className="min-h-11"
            aria-label={`${item.type === "income" ? "입금 계좌" : item.type === "non_expense_withdrawal" ? "출금처" : "결제 방법"} ${rowNumber}`}
            aria-invalid={Boolean(sourceError)}
            aria-describedby={
              sourceError ? `source-error-${rowNumber}` : undefined
            }
            label={getLedgerMoneySourceLabel({
              mode: sourceMode,
              value: sourceValue,
              paymentMethods,
              accounts,
              ownerId: userId,
              isShared,
              placeholder:
                item.type === "non_expense_withdrawal" ? "선택" : "선택 안함",
            })}
            placeholder={
              item.type === "non_expense_withdrawal" ? "선택" : "선택 안함"
            }
            onClick={() => setPicker("source")}
          />
          {sourceError && (
            <p
              id={`source-error-${rowNumber}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {sourceError}
            </p>
          )}
          <Drawer
            open={picker === "source"}
            onOpenChange={(open) => !open && setPicker(null)}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0"
              showHandle={false}
            >
              <DrawerTitle className="sr-only">
                {item.type === "income"
                  ? "입금 계좌 선택"
                  : item.type === "non_expense_withdrawal"
                    ? "출금처 선택"
                    : "결제 방법 선택"}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                검색하거나 목록에서 금융수단을 선택하세요.
              </DrawerDescription>
              <LedgerMoneySourcePickerPanel
                mode={sourceMode}
                value={sourceValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                isShared={isShared}
                title={
                  item.type === "income"
                    ? "입금 계좌 선택"
                    : item.type === "non_expense_withdrawal"
                      ? "출금처 선택"
                      : "결제 방법 선택"
                }
                searchPlaceholder="이름, 기관, 소유자 검색"
                onBack={() => setPicker(null)}
                onValueChange={(value) => {
                  setSource(value, "source");
                  setPicker(null);
                }}
              />
            </DrawerContent>
          </Drawer>
        </div>
      )}

      {sections.includes("sources") && item.type === "transfer" && (
        <div className="grid grid-cols-2 gap-3">
          {(["from", "to"] as const).map((field) => {
            const value = field === "from" ? fromValue : toValue;
            const panelOpen = picker === field;
            return (
              <div key={field} className="space-y-2">
                <Label>{field === "from" ? "어디에서" : "어디로"}</Label>
                <LedgerMoneySourceTrigger
                  ref={(node) => {
                    triggerRefs.current[field] = node;
                  }}
                  className="min-h-11"
                  aria-label={`${field === "from" ? "출발지" : "도착지"} ${rowNumber}`}
                  aria-invalid={field === "from" && Boolean(fromError)}
                  aria-describedby={
                    field === "from" && fromError
                      ? `from-error-${rowNumber}`
                      : undefined
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
                {field === "from" && fromError && (
                  <p
                    id={`from-error-${rowNumber}`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {fromError}
                  </p>
                )}
                <Drawer
                  open={panelOpen}
                  onOpenChange={(open) => !open && setPicker(null)}
                >
                  <DrawerContent
                    className="h-[85dvh] max-h-[85dvh] p-0"
                    showHandle={false}
                  >
                    <DrawerTitle className="sr-only">
                      {field === "from" ? "출발지 선택" : "도착지 선택"}
                    </DrawerTitle>
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
                      excludedValues={
                        field === "from"
                          ? toValue
                            ? [toValue]
                            : []
                          : fromValue
                            ? [fromValue]
                            : []
                      }
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
              </div>
            );
          })}
        </div>
      )}

      {sections.includes("datesBooks") && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`entry-date-${rowNumber}`}>날짜</Label>
            <DatePickerInput
              id={`entry-date-${rowNumber}`}
              className="min-h-11"
              value={item.transactedAt}
              onChange={(value) =>
                form.setValue(`items.${index}.transactedAt`, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`entry-book-${rowNumber}`}>장부</Label>
            <Select
              value={item.bookId}
              onValueChange={(value) =>
                form.setValue(`items.${index}.bookId`, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id={`entry-book-${rowNumber}`}
                className="min-h-11"
                aria-label={`장부 ${rowNumber}`}
              >
                <SelectValue placeholder="장부 선택" />
              </SelectTrigger>
              <SelectContent>
                {books
                  .filter((candidate) => !candidate.archivedAt)
                  .map((candidate) => (
                    <SelectItem
                      key={candidate.id}
                      className="min-h-11"
                      value={candidate.id}
                    >
                      {candidate.name} ·{" "}
                      {candidate.visibility === "shared" ? "공용" : "개인"}
                      {candidate.isDefault ? " · 기본" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {sections.includes("memo") && <ComposerMemoField index={index} />}
    </div>
  );
}

export function ComposerMemoField({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const value =
    useWatch({ control: form.control, name: `items.${index}.memo` }) ?? "";
  return (
    <div className="space-y-2">
      <Label htmlFor={`entry-memo-${index + 1}`}>메모</Label>
      <Textarea
        id={`entry-memo-${index + 1}`}
        aria-label={`메모 ${index + 1}`}
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

export function EntryBookNotice({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const { data: books = [] } = useLedgerBooks();
  const book = books.find((candidate) => candidate.id === item?.bookId);
  if (!book)
    return (
      <p className="text-sm text-muted-foreground">장부를 선택해주세요.</p>
    );
  return (
    <output className="text-xs text-muted-foreground">
      {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
    </output>
  );
}
