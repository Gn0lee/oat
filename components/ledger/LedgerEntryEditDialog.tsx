"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUpdateLedgerEntry } from "@/hooks/use-ledger-entries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
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

export function LedgerEntryEditDialog({
  entry,
  open,
  onOpenChange,
}: LedgerEntryEditDialogProps) {
  const updateMutation = useUpdateLedgerEntry();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const categoryType = (entry?.type ?? "expense") as CategoryType;
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

  const typeLabel = entry.type === "expense" ? "지출" : "수입";
  const typeVariant = entry.type === "expense" ? "default" : "secondary";
  const privacyLabel = entry.isShared ? "공용" : "개인";

  // 결제수단/계좌 통합 value
  const paymentValue = watchPaymentMethodId
    ? `pm:${watchPaymentMethodId}`
    : watchAccountId
      ? `acc:${watchAccountId}`
      : "";

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
          <Select
            value={watchCategoryId ?? ""}
            onValueChange={(v) =>
              setValue("categoryId", v, { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{entry.type === "expense" ? "결제 방법" : "입금 계좌"}</Label>
          {entry.type === "expense" ? (
            <Select value={paymentValue} onValueChange={handlePaymentChange}>
              <SelectTrigger>
                <SelectValue placeholder="선택 안함" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>결제수단</SelectLabel>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={`pm:${pm.id}`}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {paymentMethods.length > 0 && accounts.length > 0 && (
                  <SelectSeparator />
                )}
                {accounts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>계좌</SelectLabel>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={`acc:${acc.id}`}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={watchAccountId ?? ""}
              onValueChange={(v) => setValue("accountId", v || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택 안함" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

  // 모바일: Drawer (Bottom Sheet)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>기록 수정</DrawerTitle>
          <DrawerDescription asChild>{descriptionContent}</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form
            id="ledger-entry-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pb-2"
          >
            {infoBanner}
            {formFields}
          </form>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="ledger-entry-edit-form"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
