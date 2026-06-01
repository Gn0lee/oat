"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUpdateLedgerEntry } from "@/hooks/use-ledger-entries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import type { CategoryType } from "@/types";

interface LedgerEntryEditDialogProps {
  entry: LedgerEntryWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const editFormSchema = z.object({
  amount: z
    .string()
    .min(1, "금액을 입력해주세요.")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "금액은 0보다 커야 합니다.",
    }),
  title: z
    .string()
    .min(1, "내용을 입력해주세요.")
    .max(100, "내용은 100자 이내여야 합니다."),
  categoryId: z.string().min(1, "카테고리를 선택해주세요."),
  paymentMethodId: z.string().optional(),
  accountId: z.string().optional(),
  transactedAt: z.string().min(1, "날짜를 선택해주세요."),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;
type MobileEditView = "form" | "moneySourcePicker" | "categoryPicker";

export function LedgerEntryEditDialog({
  entry,
  open,
  onOpenChange,
}: LedgerEntryEditDialogProps) {
  const updateMutation = useUpdateLedgerEntry();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobileView, setMobileView] = useState<MobileEditView>("form");

  const categoryType =
    entry?.type === "transfer"
      ? undefined
      : ((entry?.type ?? "expense") as CategoryType);
  const { data: categories = [] } = useCategories(categoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

  const watchCategoryId = watch("categoryId");
  const watchTransactedAt = watch("transactedAt");
  const watchPaymentMethodId = watch("paymentMethodId");
  const watchAccountId = watch("accountId");

  // entry 변경 시 폼 초기화
  useEffect(() => {
    if (entry) {
      const date = new Date(entry.transactedAt);
      const formattedDate = date.toISOString().split("T")[0];

      reset({
        amount: String(entry.amount),
        title: entry.title ?? "",
        categoryId: entry.categoryId ?? "",
        paymentMethodId: entry.fromPaymentMethodId ?? undefined,
        accountId:
          entry.type === "expense"
            ? (entry.fromAccountId ?? undefined)
            : (entry.toAccountId ?? undefined),
        transactedAt: formattedDate,
        memo: entry.memo ?? "",
      });
    }
  }, [entry, reset]);

  const onSubmit = async (data: EditFormValues) => {
    if (!entry) return;

    try {
      const transactedAt = data.transactedAt.includes("T")
        ? data.transactedAt
        : `${data.transactedAt}T00:00:00.000Z`;

      const updateData: Record<string, unknown> = {
        amount: Number(data.amount),
        title: data.title,
        transactedAt,
        categoryId: data.categoryId || null,
        memo: data.memo || null,
      };

      // 유형에 따라 결제수단/계좌 필드 설정
      if (entry.type === "expense") {
        updateData.fromPaymentMethodId = data.paymentMethodId || null;
        updateData.fromAccountId = data.accountId || null;
      } else if (entry.type === "income") {
        updateData.toAccountId = data.accountId || null;
      }

      await updateMutation.mutateAsync({
        id: entry.id,
        data: updateData,
      });
      toast.success("기록이 수정되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("기록 수정에 실패했습니다.");
      }
    }
  };

  if (!entry) return null;

  const isTransfer = entry.type === "transfer";
  const typeLabel =
    entry.type === "expense"
      ? "지출"
      : entry.type === "income"
        ? "수입"
        : "이체";
  const typeVariant = entry.type === "expense" ? "default" : "secondary";
  const privacyLabel = entry.isShared ? "공용" : "개인";

  // 결제수단/계좌 통합 value
  const paymentValue = getLedgerMoneySourceValue({
    paymentMethodId: watchPaymentMethodId,
    accountId: watchAccountId,
  });

  const handlePaymentChange = (v: string) => {
    if (v.startsWith("pm:")) {
      setValue("paymentMethodId", v.slice(3));
      setValue("accountId", undefined);
    } else if (v.startsWith("acc:")) {
      setValue("accountId", v.slice(4));
      setValue("paymentMethodId", undefined);
    } else {
      setValue("paymentMethodId", undefined);
      setValue("accountId", undefined);
    }
  };

  const handleMobileMoneySourceChange = (v: string) => {
    handlePaymentChange(v);
    setMobileView("form");
  };

  const handleDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && mobileView !== "form") {
      setMobileView("form");
      return;
    }
    onOpenChange(nextOpen);
  };

  const moneySourceMode = entry.type === "expense" ? "expense" : "income";
  const moneySourcePlaceholder = "선택 안함";
  const moneySourceLabel = getLedgerMoneySourceLabel({
    mode: moneySourceMode,
    value: paymentValue,
    paymentMethods,
    accounts,
    placeholder: moneySourcePlaceholder,
  });

  const descriptionContent = (
    <div className="flex items-center gap-2">
      <Badge variant={typeVariant}>{typeLabel}</Badge>
      <Badge variant="outline">{privacyLabel}</Badge>
    </div>
  );

  const infoBanner = (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>유형이나 공개범위를 변경하려면 이 기록을 삭제 후 다시 등록해주세요.</p>
    </div>
  );

  const transferEditNotice = (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>이체 기록은 삭제 후 다시 등록해주세요.</p>
    </div>
  );

  if (isTransfer) {
    if (isDesktop) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>이체 기록</DialogTitle>
              <DialogDescription asChild>
                {descriptionContent}
              </DialogDescription>
            </DialogHeader>

            {transferEditNotice}

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0"
          showHandle={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
          >
            <XIcon className="size-5" />
          </Button>

          <div className="flex-1 overflow-y-auto px-4 pt-16 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">이체 기록</h3>
              <div className="text-sm text-gray-500">{descriptionContent}</div>
            </div>

            <div className="py-2">{transferEditNotice}</div>

            <div className="pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                확인
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  const formFields = (
    <>
      {/* 금액 */}
      <div className="space-y-2">
        <Label htmlFor="edit-amount">금액 *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            ₩
          </span>
          <Input
            id="edit-amount"
            type="number"
            inputMode="numeric"
            step="any"
            min="0"
            className="pl-7"
            {...register("amount")}
          />
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      {/* 내용 */}
      <div className="space-y-2">
        <Label htmlFor="edit-title">내용 *</Label>
        <Input
          id="edit-title"
          placeholder="예: 이마트 장보기, 스타벅스 아메리카노"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* 카테고리 + 결제수단/계좌 — 2컬럼 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>카테고리 *</Label>
          {isDesktop ? (
            <LedgerCategoryCombobox
              value={watchCategoryId ?? ""}
              categories={categories}
              placeholder="선택"
              onValueChange={(v) =>
                setValue("categoryId", v, { shouldValidate: true })
              }
            />
          ) : (
            <LedgerCategoryTrigger
              label={
                categories.find((cat) => cat.id === watchCategoryId)?.name ??
                "선택"
              }
              placeholder="선택"
              onClick={() => setMobileView("categoryPicker")}
            />
          )}
          {errors.categoryId && (
            <p className="text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{entry.type === "expense" ? "결제 방법" : "입금 계좌"}</Label>
          {isDesktop ? (
            <LedgerMoneySourceCombobox
              mode={moneySourceMode}
              value={paymentValue}
              paymentMethods={paymentMethods}
              accounts={accounts}
              placeholder={moneySourcePlaceholder}
              onValueChange={handlePaymentChange}
            />
          ) : (
            <LedgerMoneySourceTrigger
              label={moneySourceLabel}
              placeholder={moneySourcePlaceholder}
              onClick={() => setMobileView("moneySourcePicker")}
            />
          )}
        </div>
      </div>

      {/* 날짜 */}
      <div className="space-y-2">
        <Label htmlFor="edit-transactedAt">날짜</Label>
        <DatePickerInput
          id="edit-transactedAt"
          value={watchTransactedAt ?? ""}
          onChange={(v) =>
            setValue("transactedAt", v, { shouldValidate: true })
          }
        />
        {errors.transactedAt && (
          <p className="text-sm text-destructive">
            {errors.transactedAt.message}
          </p>
        )}
      </div>

      {/* 메모 */}
      <div className="space-y-2">
        <Label htmlFor="edit-memo">메모 (선택)</Label>
        <Textarea
          id="edit-memo"
          placeholder="추가로 남기고 싶은 내용을 입력하세요"
          rows={2}
          className="resize-none"
          {...register("memo")}
        />
        {errors.memo && (
          <p className="text-sm text-destructive">{errors.memo.message}</p>
        )}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>기록 수정</DialogTitle>
            <DialogDescription asChild>{descriptionContent}</DialogDescription>
          </DialogHeader>

          {infoBanner}

          <form
            id="ledger-entry-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {formFields}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // 모바일: 전체 화면 Drawer
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0"
          showHandle={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
          >
            <XIcon className="size-5" />
          </Button>

          <div className="flex-1 overflow-y-auto px-4 pt-16 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">기록 수정</h3>
              <div className="text-sm text-gray-500">{descriptionContent}</div>
            </div>

            <form
              id="ledger-entry-edit-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              {infoBanner}
              {formFields}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl text-base font-semibold"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl text-base font-semibold"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 카테고리 선택 중첩 Drawer */}
      <Drawer
        open={open && mobileView === "categoryPicker"}
        onOpenChange={(op) => {
          if (!op) setMobileView("form");
        }}
      >
        <DrawerContent
          className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex h-full flex-col pb-4">
            <LedgerCategoryPickerPanel
              value={watchCategoryId ?? ""}
              categories={categories}
              title="카테고리 선택"
              searchPlaceholder="카테고리 이름 검색"
              onBack={() => setMobileView("form")}
              onValueChange={(v) => {
                setValue("categoryId", v, { shouldValidate: true });
                setMobileView("form");
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* 결제 방법 선택 중첩 Drawer */}
      <Drawer
        open={open && mobileView === "moneySourcePicker"}
        onOpenChange={(op) => {
          if (!op) setMobileView("form");
        }}
      >
        <DrawerContent
          className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex h-full flex-col pb-4">
            <LedgerMoneySourcePickerPanel
              mode={moneySourceMode}
              value={paymentValue}
              paymentMethods={paymentMethods}
              accounts={accounts}
              title={
                entry.type === "expense" ? "결제 방법 선택" : "입금 계좌 선택"
              }
              searchPlaceholder="이름, 기관, 소유자 검색"
              onBack={() => setMobileView("form")}
              onValueChange={handleMobileMoneySourceChange}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
