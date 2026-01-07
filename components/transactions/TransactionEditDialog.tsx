"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionEditDialogProps) {
  const updateMutation = useUpdateTransaction();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

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
        memo: transaction.memo ?? "",
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: EditFormValues) => {
    if (!transaction) return;

    try {
      // transactedAt을 ISO 형식으로 변환
      const transactedAtISO = new Date(data.transactedAt).toISOString();

      await updateMutation.mutateAsync({
        id: transaction.id,
        data: {
          quantity: Number(data.quantity),
          price: Number(data.price),
          transactedAt: transactedAtISO,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>거래 수정</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {transaction.stockName}
              </span>
              <span className="text-muted-foreground">
                ({transaction.ticker})
              </span>
              <Badge variant={typeVariant}>{typeLabel}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* 안내 문구 */}
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            종목이나 거래유형을 변경하려면 이 거래를 삭제 후 다시 등록해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 수량 */}
          <div className="space-y-2">
            <Label htmlFor="quantity">수량</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0"
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
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
            <Input
              id="transactedAt"
              type="date"
              {...register("transactedAt")}
            />
            {errors.transactedAt && (
              <p className="text-sm text-destructive">
                {errors.transactedAt.message}
              </p>
            )}
          </div>

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
