"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AccountSelector } from "@/components/transactions/AccountSelector";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUpdateTransaction } from "@/hooks/use-transaction";
import type { TransactionWithDetails } from "@/lib/api/transaction";

interface TransactionEditDialogProps {
  transaction: TransactionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 폼 스키마 (클라이언트용)
const editFormSchema = z.object({
  quantity: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "수량은 0보다 커야 합니다.",
    }),
  price: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
      message: "가격은 0 이상이어야 합니다.",
    }),
  transactedAt: z.string().min(1, "거래일을 입력해주세요."),
  accountId: z.string().optional(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionEditDialogProps) {
  const updateMutation = useUpdateTransaction();
  const { data: accounts } = useAccounts();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

  const watchTransactedAt = watch("transactedAt");

  // transaction이 변경될 때 폼 값 초기화
  useEffect(() => {
    if (transaction) {
      // transactedAt을 date input 형식으로 변환 (YYYY-MM-DD)
      const date = new Date(transaction.transactedAt);
      const formattedDate = date.toISOString().split("T")[0];

      reset({
        quantity: String(transaction.quantity),
        price: String(transaction.price),
        transactedAt: formattedDate,
        accountId: transaction.accountId ?? undefined,
        memo: transaction.memo ?? "",
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: EditFormValues) => {
    if (!transaction) return;

    try {
      // transactedAt을 ISO 형식으로 변환
      const transactedAtISO = new Date(data.transactedAt).toISOString();

      // 빈 값(계좌 없음) 처리
      const accountId = data.accountId || null;

      await updateMutation.mutateAsync({
        id: transaction.id,
        data: {
          quantity: Number(data.quantity),
          price: Number(data.price),
          transactedAt: transactedAtISO,
          accountId,
          memo: data.memo || null,
        },
      });
      toast.success("거래가 수정되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("거래 수정에 실패했습니다.");
      }
    }
  };

  if (!transaction) return null;

  const typeLabel = transaction.type === "buy" ? "매수" : "매도";
  const typeVariant = transaction.type === "buy" ? "default" : "secondary";

  const descriptionContent = (
    <div className="flex items-center gap-2">
      <span className="font-medium text-foreground">
        {transaction.stockName}
      </span>
      <span className="text-muted-foreground">({transaction.ticker})</span>
      <Badge variant={typeVariant}>{typeLabel}</Badge>
    </div>
  );

  const infoBanner = (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>종목이나 거래유형을 변경하려면 이 거래를 삭제 후 다시 등록해주세요.</p>
    </div>
  );

  const formFields = (
    <>
      {/* 수량 */}
      <div className="space-y-2">
        <Label htmlFor="quantity">수량</Label>
        <Input
          id="quantity"
          type="number"
          inputMode="numeric"
          step="any"
          min="0"
          {...register("quantity")}
        />
        {errors.quantity && (
          <p className="text-sm text-destructive">{errors.quantity.message}</p>
        )}
      </div>

      {/* 단가 */}
      <div className="space-y-2">
        <Label htmlFor="price">
          단가 ({transaction.currency === "KRW" ? "원" : "$"})
        </Label>
        <Input
          id="price"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          {...register("price")}
        />
        {errors.price && (
          <p className="text-sm text-destructive">{errors.price.message}</p>
        )}
      </div>

      {/* 거래일 */}
      <div className="space-y-2">
        <Label htmlFor="transactedAt">거래일</Label>
        <DatePickerInput
          id="transactedAt"
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

      {/* 계좌 */}
      <AccountSelector
        control={control}
        name="accountId"
        variant="inline"
        placeholder="계좌 선택"
        allowClear={true}
      />

      {/* 메모 */}
      <div className="space-y-2">
        <Label htmlFor="memo">메모 (선택)</Label>
        <Textarea
          id="memo"
          placeholder="메모를 입력하세요"
          rows={2}
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
            <DialogTitle>거래 수정</DialogTitle>
            <DialogDescription asChild>{descriptionContent}</DialogDescription>
          </DialogHeader>

          {infoBanner}

          <form
            id="transaction-edit-form"
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
            <h3 className="text-lg font-bold text-gray-900">거래 수정</h3>
            <div className="text-sm text-gray-500">{descriptionContent}</div>
          </div>

          <form
            id="transaction-edit-form"
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
  );
}
