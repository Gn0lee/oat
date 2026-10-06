"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { InfoIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { composerFieldClassName } from "@/components/composer/field-styles";
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
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useUpdateLedgerEntry } from "@/hooks/use-ledger-entries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatKst } from "@/lib/date";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import { queries } from "@/lib/queries/keys";
import { cn } from "@/lib/utils/cn";
import type { CategoryType } from "@/types";

interface LedgerEntryEditDialogProps {
  entry: LedgerEntryWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (result: {
    bookId: string;
    date: string;
    bookChanged: boolean;
  }) => void;
}

const editFormSchema = z.object({
  amount: z.string().optional(),
  title: z.string().max(100, "내용은 100자 이내여야 합니다.").optional(),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  accountId: z.string().optional(),
  transactedAt: z.string().optional(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  bookId: z.string().uuid(),
});

type EditFormValues = z.infer<typeof editFormSchema>;
type MobileEditView = "form" | "moneySourcePicker" | "categoryPicker";
function isBookOnlyEdit(
  data: EditFormValues,
  original: LedgerEntryWithDetails,
) {
  return (
    original.type === "transfer" ||
    (data.bookId !== original.bookId &&
      data.amount === String(original.amount) &&
      data.title === original.title &&
      (data.categoryId || null) === (original.categoryId || null) &&
      (data.paymentMethodId || null) ===
        (original.fromPaymentMethodId || null) &&
      (data.accountId || null) ===
        ((original.type === "income"
          ? original.toAccountId
          : original.fromAccountId) || null) &&
      data.transactedAt === formatKst(original.transactedAt) &&
      (data.memo || "") === (original.memo || ""))
  );
}

export function LedgerEntryEditDialog({
  entry,
  open,
  onOpenChange,
  onUpdated,
}: LedgerEntryEditDialogProps) {
  const updateMutation = useUpdateLedgerEntry();
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobileView, setMobileView] = useState<MobileEditView>("form");

  const categoryType =
    entry?.type === "transfer"
      ? undefined
      : ((entry?.type ?? "expense") as CategoryType);
  const { data: categories = [] } = useCategories(categoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();
  const { data: books = [] } = useLedgerBooks();
  const [pendingVisibilityChange, setPendingVisibilityChange] =
    useState<EditFormValues | null>(null);
  const [pendingDiscard, setPendingDiscard] = useState(false);
  const initializedEntryRef = useRef<string | null>(null);
  const originalEntryRef = useRef<LedgerEntryWithDetails | null>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousMobileView = useRef<MobileEditView>("form");
  const discardReturnFocus = useRef<HTMLElement | null>(null);

  const dynamicSchema = editFormSchema.superRefine((data, ctx) => {
    const original = originalEntryRef.current ?? entry;
    const bookOnly = original && isBookOnlyEdit(data, original);
    if (bookOnly) return;
    if (entry?.type === "transfer") {
      return;
    }

    if (!data.amount) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "금액을 입력해 주세요.",
      });
    } else if (Number.isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "금액은 0보다 커야 합니다.",
      });
    }

    if (!data.title || data.title.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "내용을 입력해 주세요.",
      });
    }

    if (!data.transactedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["transactedAt"],
        message: "날짜를 선택해 주세요.",
      });
    }

    if (entry?.type === "non_expense_withdrawal") {
      if (!data.accountId && !data.paymentMethodId) {
        ctx.addIssue({
          code: "custom",
          path: ["accountId"],
          message: "출금처를 선택해 주세요.",
        });
      }
    } else {
      if (!data.categoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "카테고리를 선택해 주세요.",
        });
      }
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(dynamicSchema),
  });

  const watchCategoryId = watch("categoryId");
  const watchTransactedAt = watch("transactedAt");
  const watchPaymentMethodId = watch("paymentMethodId");
  const watchAccountId = watch("accountId");
  const watchTitle = watch("title");
  const watchBookId = watch("bookId");

  const closeEdit = () => {
    if (updateMutation.isPending || isSubmitting) return;
    if (isDirty) {
      discardReturnFocus.current = document.activeElement as HTMLElement | null;
      setPendingDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      initializedEntryRef.current = null;
      originalEntryRef.current = null;
      return;
    }
    if (entry && initializedEntryRef.current !== entry.id) {
      initializedEntryRef.current = entry.id;
      originalEntryRef.current = entry;
      const date = new Date(entry.transactedAt);
      const formattedDate = date.toISOString().split("T")[0];

      reset({
        amount: String(entry.amount),
        title: entry.title ?? "",
        categoryId: entry.categoryId ?? "",
        paymentMethodId: entry.fromPaymentMethodId ?? undefined,
        accountId:
          entry.type === "expense" || entry.type === "non_expense_withdrawal"
            ? (entry.fromAccountId ?? undefined)
            : (entry.toAccountId ?? undefined),
        transactedAt: formatKst(entry.transactedAt) || formattedDate,
        memo: entry.memo ?? "",
        bookId: entry.bookId,
      });
    }
  }, [entry, open, reset]);

  useEffect(() => {
    if (mobileView !== "form") {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('[data-slot="command-input"]')
          ?.focus(),
      );
    } else if (previousMobileView.current === "categoryPicker") {
      categoryTriggerRef.current?.focus();
    } else if (previousMobileView.current === "moneySourcePicker") {
      sourceTriggerRef.current?.focus();
    }
    previousMobileView.current = mobileView;
  }, [mobileView]);

  const onSubmit = async (data: EditFormValues) => {
    if (!entry) return;
    const original = originalEntryRef.current ?? entry;
    const destinationBook = books.find((book) => book.id === data.bookId);
    if (!destinationBook || destinationBook.archivedAt) {
      toast.error("활성 장부를 선택해 주세요.");
      return;
    }
    if ((destinationBook.visibility === "shared") !== original.isShared) {
      setPendingVisibilityChange(data);
      return;
    }
    await submitUpdate(data);
  };

  const submitUpdate = async (
    data: EditFormValues,
    confirmVisibilityChange = false,
  ) => {
    if (!entry) return;
    const original = originalEntryRef.current ?? entry;

    try {
      const transactedAt = data.transactedAt?.includes("T")
        ? data.transactedAt
        : data.transactedAt
          ? `${data.transactedAt}T00:00:00.000Z`
          : undefined;

      const bookOnly = isBookOnlyEdit(data, original);
      const updateData: Record<string, unknown> = bookOnly
        ? { bookId: data.bookId, expectedUpdatedAt: original.updatedAt }
        : {
            amount: Number(data.amount),
            title: data.title,
            transactedAt,
            categoryId: data.categoryId || null,
            memo: data.memo || null,
            bookId: data.bookId,
            expectedUpdatedAt: original.updatedAt,
          };
      if (confirmVisibilityChange) updateData.confirmVisibilityChange = true;

      // 유형에 따라 결제수단/계좌 필드 설정
      if (original.type !== "transfer" && !bookOnly) {
        if (
          entry.type === "expense" ||
          entry.type === "non_expense_withdrawal"
        ) {
          updateData.fromPaymentMethodId = data.paymentMethodId || null;
          updateData.fromAccountId = data.accountId || null;
        } else if (entry.type === "income") {
          updateData.toAccountId = data.accountId || null;
        }
      }

      await updateMutation.mutateAsync({
        id: entry.id,
        data: updateData,
      });
      toast.success("기록이 수정되었습니다.");
      setPendingVisibilityChange(null);
      onUpdated?.({
        bookId: data.bookId,
        date: data.transactedAt ?? formatKst(original.transactedAt),
        bookChanged: data.bookId !== original.bookId,
      });
      onOpenChange(false);
    } catch (error) {
      if (
        error instanceof ApiQueryError &&
        ["BOOK_ARCHIVED", "BOOK_UNAVAILABLE", "ENTRY_CHANGED"].includes(
          error.code,
        )
      ) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] }),
          queryClient.invalidateQueries({
            queryKey: queries.ledgerEntries._def,
          }),
        ]);
      }
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
        : entry.type === "non_expense_withdrawal"
          ? "비지출 출금"
          : "내부이체";
  const typeVariant =
    entry.type === "expense" || entry.type === "non_expense_withdrawal"
      ? "default"
      : "secondary";

  const privacyLabel = entry.isShared ? "공용" : "개인";
  const currentBook = books.find((book) => book.id === entry.bookId);
  const selectedBook = books.find((book) => book.id === watchBookId);

  // 결제수단/계좌 통합 value
  const paymentValue = getLedgerMoneySourceValue({
    paymentMethodId: watchPaymentMethodId,
    accountId: watchAccountId,
  });

  const handlePaymentChange = (v: string) => {
    if (v.startsWith("pm:")) {
      setValue("paymentMethodId", v.slice(3), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("accountId", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else if (v.startsWith("acc:")) {
      setValue("accountId", v.slice(4), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("paymentMethodId", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("paymentMethodId", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("accountId", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleMobileMoneySourceChange = (v: string) => {
    handlePaymentChange(v);
    setMobileView("form");
  };

  const moneySourceMode =
    entry.type === "expense" || entry.type === "non_expense_withdrawal"
      ? "expense"
      : "income";
  const moneySourcePlaceholder =
    entry.type === "non_expense_withdrawal" ? "선택" : "선택 안함";
  const moneySourceLabel = getLedgerMoneySourceLabel({
    mode: moneySourceMode,
    value: paymentValue,
    paymentMethods,
    accounts,
    ownerId: entry.ownerId,
    isShared: entry.isShared,
    placeholder: moneySourcePlaceholder,
  });

  const descriptionContent = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={typeVariant}>{typeLabel}</Badge>
      <Badge variant="outline">{privacyLabel}</Badge>
      <Badge variant="outline">{currentBook?.name ?? "장부"}</Badge>
      {currentBook?.archivedAt && <Badge variant="destructive">보관됨</Badge>}
    </div>
  );

  const infoBanner = !isTransfer && (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        금액, 내용, 분류, 금융수단, 날짜는 여기서 수정할 수 있습니다. 장부를
        바꾸면 표시 범위가 함께 바뀝니다.
      </p>
    </div>
  );

  const transferEditNotice = (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        내부이체는 장부만 변경할 수 있습니다. 금액과 금융수단은 그대로
        유지됩니다.
      </p>
    </div>
  );

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-book">장부</Label>
        <Select
          value={watchBookId ?? entry.bookId}
          onValueChange={(value) =>
            setValue("bookId", value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          disabled={Boolean(currentBook?.archivedAt)}
        >
          <SelectTrigger
            id="edit-book"
            aria-label="장부"
            className={composerFieldClassName}
          >
            <SelectValue placeholder="장부 선택" />
          </SelectTrigger>
          <SelectContent>
            {books
              .filter((book) => !book.archivedAt || book.id === entry.bookId)
              .map((book) => (
                <SelectItem key={book.id} className="min-h-11" value={book.id}>
                  {book.name} · {book.visibility === "shared" ? "공용" : "개인"}
                  {book.archivedAt ? " · 보관됨" : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          개인·공용 장부를 변경하면 표시 범위가 바뀝니다.
        </p>
      </div>
      {isTransfer ? (
        transferEditNotice
      ) : (
        <>
          {/* 금액 */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount">금액 *</Label>
            <div className="relative">
              <Input
                id="edit-amount"
                type="number"
                inputMode="numeric"
                step="any"
                min="0"
                className={cn(
                  composerFieldClassName,
                  "h-12 pr-10 text-xl font-semibold",
                )}
                {...register("amount")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                원
              </span>
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* 내용 */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">내용 *</Label>
            <Input
              id="edit-title"
              autoComplete="off"
              className={composerFieldClassName}
              value={watchTitle ?? ""}
              onChange={(event) =>
                setValue("title", event.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 카테고리 + 결제수단/계좌 — 2컬럼 그리드 */}
          <div
            className={
              entry.type === "non_expense_withdrawal"
                ? "grid grid-cols-1"
                : "grid grid-cols-2 gap-3"
            }
          >
            {entry.type !== "non_expense_withdrawal" && (
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                {isDesktop ? (
                  <LedgerCategoryCombobox
                    value={watchCategoryId ?? ""}
                    categories={categories}
                    type={categoryType}
                    placeholder="선택"
                    className={composerFieldClassName}
                    aria-label="카테고리"
                    onValueChange={(v) =>
                      setValue("categoryId", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                ) : (
                  <LedgerCategoryTrigger
                    ref={categoryTriggerRef}
                    className={composerFieldClassName}
                    aria-label="카테고리"
                    label={
                      categories.find((cat) => cat.id === watchCategoryId)
                        ?.name ?? "선택"
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
            )}

            <div className="space-y-2">
              <Label>
                {entry.type === "expense"
                  ? "결제 방법"
                  : entry.type === "non_expense_withdrawal"
                    ? "출금처 *"
                    : "입금 계좌"}
              </Label>
              {isDesktop ? (
                <LedgerMoneySourceCombobox
                  mode={moneySourceMode}
                  value={paymentValue}
                  paymentMethods={paymentMethods}
                  accounts={accounts}
                  ownerId={entry.ownerId}
                  isShared={
                    books.find((book) => book.id === watchBookId)
                      ?.visibility === "shared"
                  }
                  placeholder={moneySourcePlaceholder}
                  className={composerFieldClassName}
                  aria-label={
                    entry.type === "income"
                      ? "입금 계좌"
                      : entry.type === "non_expense_withdrawal"
                        ? "출금처"
                        : "결제 방법"
                  }
                  onValueChange={handlePaymentChange}
                />
              ) : (
                <LedgerMoneySourceTrigger
                  ref={sourceTriggerRef}
                  className={composerFieldClassName}
                  aria-label={
                    entry.type === "income"
                      ? "입금 계좌"
                      : entry.type === "non_expense_withdrawal"
                        ? "출금처"
                        : "결제 방법"
                  }
                  label={moneySourceLabel}
                  placeholder={moneySourcePlaceholder}
                  onClick={() => setMobileView("moneySourcePicker")}
                />
              )}
              {(errors.accountId || errors.paymentMethodId) && (
                <p className="text-sm text-destructive">
                  {errors.accountId?.message || errors.paymentMethodId?.message}
                </p>
              )}
            </div>
          </div>

          {/* 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="edit-transactedAt">날짜</Label>
            <DatePickerInput
              id="edit-transactedAt"
              className={composerFieldClassName}
              value={watchTransactedAt ?? ""}
              onChange={(v) =>
                setValue("transactedAt", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
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
              className={cn(composerFieldClassName, "resize-none")}
              {...register("memo")}
            />
            {errors.memo && (
              <p className="text-sm text-destructive">{errors.memo.message}</p>
            )}
          </div>
        </>
      )}
    </>
  );

  const visibilityConfirmDialog = (
    <Dialog
      open={Boolean(pendingVisibilityChange)}
      onOpenChange={(isOpen) =>
        !isOpen && !updateMutation.isPending && setPendingVisibilityChange(null)
      }
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {books.find((book) => book.id === pendingVisibilityChange?.bookId)
              ?.visibility === "shared"
              ? "공용 장부로 옮길까요?"
              : "개인 장부로 옮길까요?"}
          </DialogTitle>
          <DialogDescription>
            {books.find((book) => book.id === pendingVisibilityChange?.bookId)
              ?.visibility === "shared"
              ? "공용 장부로 이동하면 함께 쓰는 구성원이 이 기록을 볼 수 있습니다."
              : "개인 장부로 이동하면 다른 구성원에게 이 기록이 보이지 않습니다."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-[12px]"
            disabled={updateMutation.isPending || isSubmitting}
            onClick={() => setPendingVisibilityChange(null)}
          >
            계속 수정
          </Button>
          <Button
            type="button"
            className="min-h-11 rounded-[12px]"
            disabled={updateMutation.isPending || isSubmitting}
            onClick={() =>
              pendingVisibilityChange &&
              void submitUpdate(pendingVisibilityChange, true)
            }
          >
            {books.find((book) => book.id === pendingVisibilityChange?.bookId)
              ?.visibility === "shared"
              ? "공용 장부로 이동"
              : "개인 장부로 이동"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const discardDialog = (
    <Dialog
      open={pendingDiscard}
      onOpenChange={(nextOpen) => setPendingDiscard(nextOpen)}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => discardReturnFocus.current?.focus());
        }}
      >
        <DialogHeader>
          <DialogTitle>수정한 내용을 버릴까요?</DialogTitle>
          <DialogDescription>
            저장하지 않은 변경 사항은 사라집니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-[12px]"
            disabled={updateMutation.isPending || isSubmitting}
            onClick={() => setPendingDiscard(false)}
          >
            계속 수정
          </Button>
          <Button
            type="button"
            className="min-h-11 rounded-[12px]"
            disabled={updateMutation.isPending || isSubmitting}
            onClick={() => {
              discardReturnFocus.current = null;
              setPendingDiscard(false);
              onOpenChange(false);
            }}
          >
            변경 내용 버리기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isDesktop) {
    return (
      <>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => !nextOpen && closeEdit()}
        >
          <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>기록 수정</DialogTitle>
              <DialogDescription asChild>
                {descriptionContent}
              </DialogDescription>
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
                  className="min-h-11 rounded-[12px]"
                  onClick={closeEdit}
                  disabled={isSubmitting || updateMutation.isPending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="min-h-11 rounded-[12px]"
                  disabled={isSubmitting || Boolean(currentBook?.archivedAt)}
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {visibilityConfirmDialog}
        {discardDialog}
      </>
    );
  }

  // 모바일: 전체 화면 Drawer
  return (
    <>
      <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && closeEdit()}>
        <DrawerContent
          className="h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0"
          showHandle={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DrawerDescription className="sr-only">
            기록의 내용을 수정합니다.
          </DrawerDescription>
          <Button
            type="button"
            variant="ghost"
            aria-label="기록 수정 닫기"
            onClick={closeEdit}
            disabled={isSubmitting || updateMutation.isPending}
            className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <XIcon className="size-5" />
          </Button>

          <div className="flex-1 overflow-y-auto px-4 pt-16 space-y-4">
            <div className="space-y-1">
              <DrawerTitle className="text-lg font-bold text-foreground">
                기록 수정
              </DrawerTitle>
              <div className="text-sm text-muted-foreground">
                {descriptionContent}
              </div>
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
                  onClick={closeEdit}
                  disabled={
                    isSubmitting ||
                    updateMutation.isPending ||
                    Boolean(currentBook?.archivedAt)
                  }
                  className="min-h-12 flex-1 rounded-[12px] text-base font-semibold"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    updateMutation.isPending ||
                    Boolean(currentBook?.archivedAt)
                  }
                  className="min-h-12 flex-1 rounded-[12px] text-base font-semibold"
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
          <DrawerTitle className="sr-only">카테고리 선택</DrawerTitle>
          <DrawerDescription className="sr-only">
            검색하거나 목록에서 카테고리를 선택하세요.
          </DrawerDescription>
          <div className="flex h-full flex-col pb-4">
            <LedgerCategoryPickerPanel
              value={watchCategoryId ?? ""}
              categories={categories}
              type={categoryType}
              title="카테고리 선택"
              searchPlaceholder="카테고리 이름 검색"
              onBack={() => setMobileView("form")}
              onValueChange={(v) => {
                setValue("categoryId", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
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
          <DrawerTitle className="sr-only">
            {entry.type === "income"
              ? "입금 계좌 선택"
              : entry.type === "non_expense_withdrawal"
                ? "출금처 선택"
                : "결제 방법 선택"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            검색하거나 목록에서 금융수단을 선택하세요.
          </DrawerDescription>
          <div className="flex h-full flex-col pb-4">
            <LedgerMoneySourcePickerPanel
              mode={moneySourceMode}
              value={paymentValue}
              paymentMethods={paymentMethods}
              accounts={accounts}
              ownerId={entry.ownerId}
              isShared={selectedBook?.visibility === "shared"}
              title={
                entry.type === "expense"
                  ? "결제 방법 선택"
                  : entry.type === "non_expense_withdrawal"
                    ? "출금처 선택"
                    : "입금 계좌 선택"
              }
              searchPlaceholder="이름, 기관, 소유자 검색"
              onBack={() => setMobileView("form")}
              onValueChange={handleMobileMoneySourceChange}
            />
          </div>
        </DrawerContent>
      </Drawer>
      {visibilityConfirmDialog}
      {discardDialog}
    </>
  );
}
