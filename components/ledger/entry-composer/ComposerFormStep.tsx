"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { SegmentedChoiceGroup } from "@/components/layout";
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
import { LedgerTagInput } from "@/components/ledger/LedgerTagInput";
import { LedgerTitleCombobox } from "@/components/ledger/LedgerTitleCombobox";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerTags } from "@/hooks/use-ledger-tags";
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
    "form" | "moneySourcePicker" | "categoryPicker" | "fromPicker" | "toPicker"
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
  const { userId } = useCurrentUserId();
  const { data: availableTags = [] } = useLedgerTags();

  const itemType = form.watch(`items.${index}.type`);
  const itemIsShared = form.watch(`items.${index}.isShared`);
  const categories =
    itemType === "expense" ? expenseCategories : incomeCategories;
  const errors = form.formState.errors.items?.[index];
  const fromValue = form.watch(`items.${index}.fromValue`) ?? "";
  const toValue = form.watch(`items.${index}.toValue`) ?? "";

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

  const handleTypeChange = (
    value: "expense" | "income" | "transfer" | "non_expense_withdrawal",
  ) => {
    form.setValue(`items.${index}.type`, value);
    form.setValue(`items.${index}.categoryId`, "");
    form.setValue(`items.${index}.paymentMethodId`, undefined);
    form.setValue(`items.${index}.accountId`, undefined);
    form.setValue(`items.${index}.fromValue`, "");
    form.setValue(`items.${index}.toValue`, "");
  };

  const handleFromValueChange = (value: string) => {
    form.setValue(`items.${index}.fromValue`, value, { shouldValidate: true });
    if (value === form.watch(`items.${index}.toValue`)) {
      form.setValue(`items.${index}.toValue`, "", { shouldValidate: true });
    }
  };

  const handleToValueChange = (value: string) => {
    form.setValue(`items.${index}.toValue`, value, { shouldValidate: true });
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
      <div className="flex-1 overflow-y-auto px-4 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 space-y-2 col-span-2">
            <Label className="text-sm text-gray-700">유형</Label>
            <SegmentedChoiceGroup
              value={itemType}
              columns={4}
              onValueChange={handleTypeChange}
              options={[
                {
                  value: "expense",
                  label: "지출",
                  selectedClassName: "bg-[#3182F6] text-white",
                },
                {
                  value: "income",
                  label: "수입",
                  selectedClassName: "bg-[#F04452] text-white",
                },
                { value: "transfer", label: "내부이체" },
                {
                  value: "non_expense_withdrawal",
                  label: "비지출",
                  selectedClassName: "bg-gray-800 text-white",
                },
              ]}
            />
          </div>

          <div className="min-w-0 space-y-2 col-span-2">
            <Label className="text-sm text-gray-700">공개범위</Label>
            <SegmentedChoiceGroup
              value={itemIsShared ? "shared" : "private"}
              columns={2}
              onValueChange={(value) =>
                form.setValue(`items.${index}.isShared`, value === "shared")
              }
              options={[
                { value: "shared", label: "공용" },
                { value: "private", label: "개인" },
              ]}
            />
          </div>
        </div>

        {itemType === "non_expense_withdrawal" && (
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            카드대금, 대출상환 등 이미 기록된 지출의 정산
          </div>
        )}

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

        {itemType !== "transfer" && itemType !== "non_expense_withdrawal" && (
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">카테고리 *</Label>
            {isDesktop ? (
              <LedgerCategoryCombobox
                value={form.watch(`items.${index}.categoryId`) ?? ""}
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
              <p className="text-xs text-red-500">
                {errors.categoryId.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-sm text-gray-700">내용 *</Label>
          <LedgerTitleCombobox
            value={form.watch(`items.${index}.title`) ?? ""}
            onValueChange={(value) =>
              form.setValue(`items.${index}.title`, value, {
                shouldValidate: true,
              })
            }
            placeholder={
              itemType === "transfer"
                ? "예: 카카오페이 충전, 증권 계좌 입금"
                : itemType === "non_expense_withdrawal"
                  ? "예: 신한카드 6월 대금, 신용대출 상환"
                  : "예: 점심, 커피"
            }
          />
          {errors?.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">금액 *</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="pr-10"
                {...form.register(`items.${index}.amount`)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                원
              </span>
            </div>
            {errors?.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {itemType !== "transfer" && (
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">
                {itemType === "expense"
                  ? "결제 방법"
                  : itemType === "non_expense_withdrawal"
                    ? "출금처 *"
                    : "입금 계좌"}
              </Label>
              {isDesktop ? (
                <LedgerMoneySourceCombobox
                  mode={
                    itemType === "non_expense_withdrawal" ? "expense" : itemType
                  }
                  value={moneySourceValue}
                  paymentMethods={paymentMethods}
                  accounts={accounts}
                  ownerId={userId}
                  placeholder={
                    itemType === "non_expense_withdrawal" ? "선택" : "선택 안함"
                  }
                  onValueChange={handleMoneySourceChange}
                />
              ) : (
                <LedgerMoneySourceTrigger
                  label={getLedgerMoneySourceLabel({
                    mode:
                      itemType === "non_expense_withdrawal"
                        ? "expense"
                        : itemType,
                    value: moneySourceValue,
                    paymentMethods,
                    accounts,
                    placeholder:
                      itemType === "non_expense_withdrawal"
                        ? "선택"
                        : "선택 안함",
                  })}
                  placeholder={
                    itemType === "non_expense_withdrawal" ? "선택" : "선택 안함"
                  }
                  onClick={() => setMobileView("moneySourcePicker")}
                />
              )}
              {(errors?.accountId || errors?.paymentMethodId) && (
                <p className="text-xs text-red-500">
                  {errors.accountId?.message || errors.paymentMethodId?.message}
                </p>
              )}
            </div>
          )}
        </div>

        {itemType === "transfer" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm text-gray-700">어디에서 *</Label>
              {isDesktop ? (
                <LedgerMoneySourceCombobox
                  mode="transfer"
                  value={fromValue}
                  paymentMethods={paymentMethods}
                  accounts={accounts}
                  ownerId={userId}
                  includeClearOption={false}
                  excludedValues={toValue ? [toValue] : []}
                  placeholder="선택"
                  onValueChange={handleFromValueChange}
                />
              ) : (
                <LedgerMoneySourceTrigger
                  label={getLedgerMoneySourceLabel({
                    mode: "transfer",
                    value: fromValue,
                    paymentMethods,
                    accounts,
                    placeholder: "선택",
                  })}
                  placeholder="선택"
                  onClick={() => setMobileView("fromPicker")}
                />
              )}
              {errors?.fromValue && (
                <p className="text-xs text-red-500">
                  {errors.fromValue.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-gray-700">어디로 *</Label>
              {isDesktop ? (
                <LedgerMoneySourceCombobox
                  mode="transfer"
                  value={toValue}
                  paymentMethods={paymentMethods}
                  accounts={accounts}
                  ownerId={userId}
                  accountOwnerScope="household"
                  includeClearOption={false}
                  excludedValues={fromValue ? [fromValue] : []}
                  placeholder="선택"
                  onValueChange={handleToValueChange}
                />
              ) : (
                <LedgerMoneySourceTrigger
                  label={getLedgerMoneySourceLabel({
                    mode: "transfer",
                    value: toValue,
                    paymentMethods,
                    accounts,
                    placeholder: "선택",
                  })}
                  placeholder="선택"
                  onClick={() => setMobileView("toPicker")}
                />
              )}
              {errors?.toValue && (
                <p className="text-xs text-red-500">{errors.toValue.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-sm text-gray-700">태그</Label>
          <Controller
            control={form.control}
            name={`items.${index}.tags`}
            render={({ field }) => (
              <LedgerTagInput
                value={field.value || []}
                onValueChange={field.onChange}
                availableTags={availableTags}
                placeholder="태그를 입력하세요 (예: #데이트)"
                error={errors?.tags?.message}
              />
            )}
          />
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
          {itemType !== "transfer" && itemType !== "non_expense_withdrawal" && (
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
                  value={form.watch(`items.${index}.categoryId`) ?? ""}
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
          )}

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
                mode={
                  itemType === "non_expense_withdrawal" ? "expense" : itemType
                }
                value={moneySourceValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                title={
                  itemType === "expense"
                    ? "결제 방법 선택"
                    : itemType === "non_expense_withdrawal"
                      ? "출금처 선택"
                      : "입금 계좌 선택"
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

          <Drawer
            open={mobileView === "fromPicker"}
            onOpenChange={(open) => {
              if (!open) setMobileView("form");
            }}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <LedgerMoneySourcePickerPanel
                mode="transfer"
                value={fromValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                includeClearOption={false}
                excludedValues={toValue ? [toValue] : []}
                title="어디에서"
                searchPlaceholder="계좌, 페이머니, 상품권, 현금 검색"
                onBack={() => setMobileView("form")}
                onValueChange={(v) => {
                  handleFromValueChange(v);
                  setMobileView("form");
                }}
              />
            </DrawerContent>
          </Drawer>

          <Drawer
            open={mobileView === "toPicker"}
            onOpenChange={(open) => {
              if (!open) setMobileView("form");
            }}
          >
            <DrawerContent
              className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <LedgerMoneySourcePickerPanel
                mode="transfer"
                value={toValue}
                paymentMethods={paymentMethods}
                accounts={accounts}
                ownerId={userId}
                accountOwnerScope="household"
                includeClearOption={false}
                excludedValues={fromValue ? [fromValue] : []}
                title="어디로"
                searchPlaceholder="계좌, 페이머니, 상품권, 현금 검색"
                onBack={() => setMobileView("form")}
                onValueChange={(v) => {
                  handleToValueChange(v);
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
