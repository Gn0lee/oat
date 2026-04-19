"use client";

import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeletePaymentMethod } from "@/hooks/use-payment-methods";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";

const PAYMENT_METHOD_TYPE_LABELS: Record<string, string> = {
  credit_card: "신용카드",
  debit_card: "체크카드",
  prepaid: "선불페이",
  gift_card: "상품권",
  cash: "현금",
};

interface PaymentMethodDeleteDialogProps {
  paymentMethod: PaymentMethodWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentMethodDeleteDialog({
  paymentMethod,
  open,
  onOpenChange,
}: PaymentMethodDeleteDialogProps) {
  const deleteMutation = useDeletePaymentMethod();

  const handleDelete = async () => {
    if (!paymentMethod) return;

    try {
      await deleteMutation.mutateAsync(paymentMethod.id);
      toast.success(`${paymentMethod.name}이(가) 삭제되었습니다.`);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("결제수단 삭제에 실패했습니다.");
      }
    }
  };

  if (!paymentMethod) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            결제수단 삭제
          </DialogTitle>
          <DialogDescription>
            다음 결제수단을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{paymentMethod.name}</span>
            {paymentMethod.isDefault && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                기본
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>유형</span>
              <span>
                {PAYMENT_METHOD_TYPE_LABELS[paymentMethod.type] ||
                  paymentMethod.type}
              </span>
            </div>
            {paymentMethod.issuer && (
              <div className="flex justify-between">
                <span>카드사/서비스</span>
                <span>{paymentMethod.issuer}</span>
              </div>
            )}
            {paymentMethod.lastFour && (
              <div className="flex justify-between">
                <span>카드번호 끝 4자리</span>
                <span>···· {paymentMethod.lastFour}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
