"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TaskFormSurface } from "@/components/layout";
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
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useCreateRecordChangeRequest } from "@/hooks/use-record-change-requests";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import {
  buildLedgerRecordUpdateProposedChanges,
  type LedgerRecordUpdateRequestFormValues,
} from "@/lib/ledger/record-change-request";
import { formatCurrency } from "@/lib/utils/format";
import type { CategoryType } from "@/types";

type RequestMode = "update" | "delete";
type MobileRequestView = "form" | "categoryPicker" | "moneySourcePicker";

interface LedgerEntryChangeRequestDialogProps {
  entry: LedgerEntryWithDetails | null;
  mode: RequestMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitialMoneySourceId(entry: LedgerEntryWithDetails) {
  const value = getLedgerMoneySourceValue({
    paymentMethodId:
      entry.type === "expense" || entry.type === "non_expense_withdrawal"
        ? entry.fromPaymentMethodId
        : entry.toPaymentMethodId,
    accountId:
      entry.type === "expense" || entry.type === "non_expense_withdrawal"
        ? entry.fromAccountId
        : entry.toAccountId,
  });

  return value || "none";
}

function getInitialValues(
  entry: LedgerEntryWithDetails,
): LedgerRecordUpdateRequestFormValues {
  return {
    amount: entry.amount,
    title: entry.title ?? "",
    categoryId: entry.categoryId,
    moneySourceId: getInitialMoneySourceId(entry),
    transactedAt: entry.transactedAt.slice(0, 10),
    memo: entry.memo,
  };
}

export function LedgerEntryChangeRequestDialog({
  entry,
  mode,
  open,
  onOpenChange,
}: LedgerEntryChangeRequestDialogProps) {
  const createMutation = useCreateRecordChangeRequest();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [values, setValues] =
    useState<LedgerRecordUpdateRequestFormValues | null>(null);
  const [message, setMessage] = useState("");
  const [mobileView, setMobileView] = useState<MobileRequestView>("form");

  const categoryType =
    entry?.type === "transfer" || entry?.type === "non_expense_withdrawal"
      ? undefined
      : entry?.type;

  const { data: categories = [] } = useCategories(categoryType as CategoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  useEffect(() => {
    if (!entry || !open) return;
    setValues(getInitialValues(entry));
    setMessage("");
    setMobileView("form");
  }, [entry, open]);

  if (!entry || !values) return null;

  const isUpdate = mode === "update";
  const title = isUpdate ? "수정 요청" : "삭제 요청";
  const description = isUpdate
    ? "바꾸고 싶은 값을 입력하면 기록 소유자에게 요청이 전달됩니다."
    : "기록 소유자에게 삭제 사유가 전달됩니다.";

  const handleSubmit = async () => {
    try {
      if (isUpdate) {
        const proposedChanges = buildLedgerRecordUpdateProposedChanges(
          entry,
          values,
        );

        if (Object.keys(proposedChanges).length === 0) {
          toast.error("변경할 항목을 하나 이상 입력해주세요.");
          return;
        }

        await createMutation.mutateAsync({
          targetType: "ledger_entry",
          targetId: entry.id,
          requestType: "update",
          message: message.trim() || undefined,
          proposedChanges,
        });
      } else {
        if (!message.trim()) {
          toast.error("삭제 사유를 입력해주세요.");
          return;
        }

        await createMutation.mutateAsync({
          targetType: "ledger_entry",
          targetId: entry.id,
          requestType: "delete",
          message: message.trim() || undefined,
          proposedChanges: {},
        });
      }

      toast.success("요청을 보냈습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청 생성에 실패했습니다.",
      );
    }
  };

  const updateValue = <K extends keyof LedgerRecordUpdateRequestFormValues>(
    key: K,
    value: LedgerRecordUpdateRequestFormValues[K],
  ) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));

  const moneySourceMode =
    entry.type === "expense" || entry.type === "non_expense_withdrawal"
      ? "expense"
      : "income";
  const moneySourcePlaceholder =
    entry.type === "non_expense_withdrawal" ? "선택" : "선택 안함";
  const moneySourceLabel = getLedgerMoneySourceLabel({
    mode: moneySourceMode,
    value: values.moneySourceId === "none" ? "" : values.moneySourceId,
    paymentMethods,
    accounts,
    ownerId: entry.ownerId,
    placeholder: moneySourcePlaceholder,
  });
  const selectedCategoryLabel =
    categories.find((category) => category.id === values.categoryId)?.name ??
    "선택";
  const handleMoneySourceChange = (value: string) => {
    updateValue("moneySourceId", value || "none");
  };
  const canEditCategory =
    entry.type !== "transfer" && entry.type !== "non_expense_withdrawal";
  const canEditMoneySource = entry.type !== "transfer";

  return (
    <>
      <TaskFormSurface
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
      >
        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">
              {entry.title ?? entry.categoryName ?? "미분류"}
            </span>
            <span className="font-semibold">
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.ownerName} · {entry.transactedAt.slice(0, 10)}
          </p>
        </div>

        {isUpdate ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-amount">금액</Label>
              <div className="relative">
                <Input
                  id="request-amount"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="pr-10"
                  value={values.amount}
                  onChange={(event) =>
                    updateValue("amount", Number(event.target.value))
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                  원
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-title">내용</Label>
              <Input
                id="request-title"
                value={values.title}
                onChange={(event) => updateValue("title", event.target.value)}
              />
            </div>

            {(canEditCategory || canEditMoneySource) && (
              <div
                className={
                  entry.type === "non_expense_withdrawal"
                    ? "grid grid-cols-1"
                    : "grid grid-cols-2 gap-3"
                }
              >
                {canEditCategory && (
                  <div className="space-y-2">
                    <Label>카테고리</Label>
                    {isDesktop ? (
                      <LedgerCategoryCombobox
                        value={values.categoryId ?? ""}
                        categories={categories}
                        type={categoryType as CategoryType}
                        placeholder="선택"
                        onValueChange={(value) =>
                          updateValue("categoryId", value)
                        }
                      />
                    ) : (
                      <LedgerCategoryTrigger
                        label={selectedCategoryLabel}
                        placeholder="선택"
                        onClick={() => setMobileView("categoryPicker")}
                      />
                    )}
                  </div>
                )}

                {canEditMoneySource && (
                  <div className="space-y-2">
                    <Label>
                      {entry.type === "expense"
                        ? "결제 방법"
                        : entry.type === "non_expense_withdrawal"
                          ? "출금처"
                          : "입금 계좌"}
                    </Label>
                    {isDesktop ? (
                      <LedgerMoneySourceCombobox
                        mode={moneySourceMode}
                        value={
                          values.moneySourceId === "none"
                            ? ""
                            : values.moneySourceId
                        }
                        paymentMethods={paymentMethods}
                        accounts={accounts}
                        ownerId={entry.ownerId}
                        placeholder={moneySourcePlaceholder}
                        onValueChange={handleMoneySourceChange}
                      />
                    ) : (
                      <LedgerMoneySourceTrigger
                        label={moneySourceLabel}
                        placeholder={moneySourcePlaceholder}
                        onClick={() => setMobileView("moneySourcePicker")}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="request-date">날짜</Label>
              <DatePickerInput
                id="request-date"
                value={values.transactedAt}
                onChange={(value) => updateValue("transactedAt", value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-memo">메모</Label>
              <Textarea
                id="request-memo"
                value={values.memo ?? ""}
                rows={2}
                className="resize-none"
                onChange={(event) => updateValue("memo", event.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="request-message">
            {isUpdate ? "요청 메시지 (선택)" : "삭제 사유"}
          </Label>
          <Textarea
            id="request-message"
            value={message}
            rows={3}
            className="resize-none"
            placeholder={
              isUpdate
                ? "소유자가 확인할 수 있는 설명을 남겨주세요."
                : "삭제가 필요한 이유를 입력해주세요."
            }
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "요청 중..." : "요청 보내기"}
          </Button>
        </div>
      </TaskFormSurface>

      {!isDesktop && canEditCategory && (
        <Drawer
          open={open && mobileView === "categoryPicker"}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setMobileView("form");
          }}
        >
          <DrawerContent
            className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <LedgerCategoryPickerPanel
              value={values.categoryId ?? ""}
              categories={categories}
              type={categoryType as CategoryType}
              title="카테고리 선택"
              searchPlaceholder="카테고리 이름 검색"
              onBack={() => setMobileView("form")}
              onValueChange={(value) => {
                updateValue("categoryId", value);
                setMobileView("form");
              }}
            />
          </DrawerContent>
        </Drawer>
      )}

      {!isDesktop && canEditMoneySource && (
        <Drawer
          open={open && mobileView === "moneySourcePicker"}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setMobileView("form");
          }}
        >
          <DrawerContent
            className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <LedgerMoneySourcePickerPanel
              mode={moneySourceMode}
              value={
                values.moneySourceId === "none" ? "" : values.moneySourceId
              }
              paymentMethods={paymentMethods}
              accounts={accounts}
              ownerId={entry.ownerId}
              title={
                entry.type === "expense"
                  ? "결제 방법 선택"
                  : entry.type === "non_expense_withdrawal"
                    ? "출금처 선택"
                    : "입금 계좌 선택"
              }
              searchPlaceholder="이름, 기관, 소유자 검색"
              onBack={() => setMobileView("form")}
              onValueChange={(value) => {
                handleMoneySourceChange(value);
                setMobileView("form");
              }}
            />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
