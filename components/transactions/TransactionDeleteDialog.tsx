"use client";

import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
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
import { useDeleteTransaction } from "@/hooks/use-transaction";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency } from "@/lib/utils/format";

interface TransactionDeleteDialogProps {
  transaction: TransactionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDeleteDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionDeleteDialogProps) {
  const deleteMutation = useDeleteTransaction();

  const handleDelete = async () => {
    if (!transaction) return;

    try {
      await deleteMutation.mutateAsync(transaction.id);
      toast.success("거래가 삭제되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("거래 삭제에 실패했습니다.");
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            거래 삭제
          </DialogTitle>
          <DialogDescription>
            다음 거래를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 삭제 대상 거래 정보 */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{transaction.stockName}</span>
            <Badge variant={typeVariant}>{typeLabel}</Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>종목 코드</span>
              <span>{transaction.ticker}</span>
            </div>
            <div className="flex justify-between">
              <span>수량</span>
              <span>{transaction.quantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>단가</span>
              <span>
                {formatCurrency(transaction.price, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>총 금액</span>
              <span className="font-medium text-foreground">
                {formatCurrency(transaction.totalAmount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>거래일</span>
              <span>
                {new Date(transaction.transactedAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
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
