"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  LedgerCategoryCombobox,
  LedgerCategoryPickerPanel,
  LedgerCategoryTrigger,
} from "@/components/ledger/LedgerCategoryCombobox";
import {
  getLedgerMoneySourceLabel,
  LedgerMoneySourceCombobox,
  LedgerMoneySourcePickerPanel,
  LedgerMoneySourceTrigger,
} from "@/components/ledger/LedgerMoneySourceCombobox";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

interface ComposerFormStepProps {
  index: number;
  mode: "full" | "daily";
  onBack: () => void;
}

export function ComposerFormStep({
  index,
  mode,
  onBack,
}: ComposerFormStepProps) {
  const form = useFormContext<LedgerComposerFormValues>();
  const [snapshot] = useState(() => form.getValues(`items.${index}`));
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobileView, setMobileView] = useState<
    "form" | "moneySourcePicker" | "categoryPicker"
  >("form");

  const handleCancel = () => {
    form.setValue(`items.${index}`, snapshot);
    onBack();
  };

  const handleConfirm = async () => {
    const isValid = await form.trigger(`items.${index}`);
    if (isValid) {
      onBack();
    }
  };

  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const itemType = form.watch(`items.${index}.type`);
  const itemIsShared = form.watch(`items.${index}.isShared`);
  const categories =
    itemType === "expense" ? expenseCategories : incomeCategories;
  const errors = form.formState.errors.items?.[index];

  const moneySourceValue = getLedgerMoneySourceValue({
    paymentMethodId: form.watch(`items.${index}.paymentMethodId`),
    accountId: form.watch(`items.${index}.accountId`),
  });

  const handleMoneySourceChange = (value: string) => {
    if (value.startsWith("pm:")) {
      form.setValue(`items.${index}.paymentMethodId`, value.slice(3));
      form.setValue(`items.${index}.accountId`, undefined);
      return;
    }
    if (value.startsWith("acc:")) {
      form.setValue(`items.${index}.accountId`, value.slice(4));
      form.setValue(`items.${index}.paymentMethodId`, undefined);
      return;
    }
    form.setValue(`items.${index}.paymentMethodId`, undefined);
    form.setValue(`items.${index}.accountId`, undefined);
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
      >
        <XIcon className="size-5" />
      </Button>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-16 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 space-y-1">
            <Label className="text-sm text-gray-700">유형</Label>
            <Select
              value={itemType}
              onValueChange={(value) => {
                form.setValue(
                  `items.${index}.type`,
                  value as "expense" | "income",
                );
                form.setValue(`items.${index}.categoryId`, "");
                form.setValue(`items.${index}.paymentMethodId`, undefined);
                form.setValue(`items.${index}.accountId`, undefined);
              }}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">지출</SelectItem>
                <SelectItem value="income">수입</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1">
            <Label className="text-sm text-gray-700">공개범위</Label>
            <Select
              value={itemIsShared ? "shared" : "private"}
              onValueChange={(value) =>
                form.setValue(`items.${index}.isShared`, value === "shared")
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">공용</SelectItem>
                <SelectItem value="private">개인</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "full" && (
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">날짜</Label>
            <DatePickerInput
              value={form.watch(`items.${index}.transactedAt`)}
              onChange={(value) =>
                form.setValue(`items.${index}.transactedAt`, value, {
                  shouldValidate: true,
                })
              }
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-sm text-gray-700">카테고리 *</Label>
          {isDesktop ? (
            <LedgerCategoryCombobox
              value={form.watch(`items.${index}.categoryId`)}
              categories={categories}
              type={itemType}
              placeholder="선택"
              onValueChange={(value) =>
                form.setValue(`items.${index}.categoryId`, value, {
                  shouldValidate: true,
                })
              }
            />
          ) : (
            <LedgerCategoryTrigger
              label={
                categories.find(
                  (cat) => cat.id === form.watch(`items.${index}.categoryId`),
                )?.name ?? "선택"
              }
              placeholder="선택"
              onClick={() => setMobileView("categoryPicker")}
            />
          )}
          {errors?.categoryId && (
            <p className="text-xs text-red-500">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-gray-700">내용 *</Label>
          <Input
            placeholder="예: 점심, 커피"
            {...form.register(`items.${index}.title`)}
          />
          {errors?.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">금액 *</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              {...form.register(`items.${index}.amount`)}
            />
            {errors?.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">
              {itemType === "expense" ? "결제 방법" : "입금 계좌"}
            </Label>
            {isDesktop ? (
              <LedgerMoneySourceCombobox
                mode={itemType}
                value={moneySourceValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                placeholder="선택 안함"
                onValueChange={handleMoneySourceChange}
              />
            ) : (
              <LedgerMoneySourceTrigger
                label={getLedgerMoneySourceLabel({
                  mode: itemType,
                  value: moneySourceValue,
                  paymentMethods,
                  accounts,
                  placeholder: "선택 안함",
                })}
                placeholder="선택 안함"
                onClick={() => setMobileView("moneySourcePicker")}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-gray-700">메모</Label>
          <Textarea
            placeholder="추가로 남기고 싶은 내용을 입력하세요"
            rows={2}
            className="resize-none"
            {...form.register(`items.${index}.memo`)}
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          onClick={handleConfirm}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          완료
        </Button>
      </div>

      {!isDesktop && (
        <>
          <Drawer
            open={mobileView === "categoryPicker"}
            onOpenChange={(open) => {
              if (!open) setMobileView("form");
            }}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <LedgerCategoryPickerPanel
                value={form.watch(`items.${index}.categoryId`)}
                categories={categories}
                type={itemType}
                title="카테고리 선택"
                searchPlaceholder="카테고리 이름 검색"
                onBack={() => setMobileView("form")}
                onValueChange={(v) => {
                  form.setValue(`items.${index}.categoryId`, v, {
                    shouldValidate: true,
                  });
                  setMobileView("form");
                }}
              />
            </DrawerContent>
          </Drawer>

          <Drawer
            open={mobileView === "moneySourcePicker"}
            onOpenChange={(open) => {
              if (!open) setMobileView("form");
            }}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <LedgerMoneySourcePickerPanel
                mode={itemType}
                value={moneySourceValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                title={
                  itemType === "expense" ? "결제 방법 선택" : "입금 계좌 선택"
                }
                searchPlaceholder="이름, 기관, 소유자 검색"
                onBack={() => setMobileView("form")}
                onValueChange={(v) => {
                  handleMoneySourceChange(v);
                  setMobileView("form");
                }}
              />
            </DrawerContent>
          </Drawer>
        </>
      )}
    </>
  );
}
