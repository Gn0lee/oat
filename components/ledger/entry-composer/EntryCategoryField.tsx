"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  LedgerCategoryCombobox,
  LedgerCategoryPickerPanel,
  LedgerCategoryTrigger,
} from "@/components/ledger/LedgerCategoryCombobox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/use-categories";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ledgerFieldClassName } from "./field-styles";

export function EntryCategoryField({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousOpen = useRef(false);
  const type = item?.type === "income" ? "income" : "expense";
  const { data: categories = [] } = useCategories(type);
  const category = categories.find((entry) => entry.id === item?.categoryId);
  const error = form.getFieldState(`items.${index}.categoryId`, form.formState)
    .error?.message;
  const rowNumber = index + 1;

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('[data-slot="command-input"]')
          ?.focus(),
      );
    } else if (previousOpen.current) triggerRef.current?.focus();
    previousOpen.current = open;
  }, [open]);

  if (!item || (item.type !== "expense" && item.type !== "income")) return null;
  const selectCategory = (value: string) =>
    form.setValue(`items.${index}.categoryId`, value, {
      shouldDirty: true,
      shouldValidate: true,
    });

  return (
    <div className="space-y-2">
      <Label>카테고리</Label>
      {isDesktop ? (
        <LedgerCategoryCombobox
          value={item.categoryId ?? ""}
          categories={categories}
          type={type}
          placeholder="카테고리 선택"
          className={ledgerFieldClassName}
          aria-label={`카테고리 ${rowNumber}`}
          onValueChange={selectCategory}
        />
      ) : (
        <>
          <LedgerCategoryTrigger
            ref={triggerRef}
            className={ledgerFieldClassName}
            aria-label={`카테고리 ${rowNumber}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `category-error-${rowNumber}` : undefined}
            label={category?.name ?? "카테고리 선택"}
            placeholder="카테고리 선택"
            onClick={() => setOpen(true)}
          />
          <Drawer open={open} onOpenChange={setOpen}>
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
                type={type}
                title="카테고리 선택"
                searchPlaceholder="카테고리 이름 검색"
                onBack={() => setOpen(false)}
                onValueChange={(value) => {
                  selectCategory(value);
                  setOpen(false);
                }}
              />
            </DrawerContent>
          </Drawer>
        </>
      )}
      {error && (
        <p
          id={`category-error-${rowNumber}`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
