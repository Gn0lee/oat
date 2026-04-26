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
import { useDeleteLedgerEntry } from "@/hooks/use-ledger-entries";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryDeleteDialogProps {
  entry: LedgerEntryWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LedgerEntryDeleteDialog({
  entry,
  open,
  onOpenChange,
}: LedgerEntryDeleteDialogProps) {
  const deleteMutation = useDeleteLedgerEntry();

  const handleDelete = async () => {
    if (!entry) return;

    try {
      await deleteMutation.mutateAsync(entry.id);
      toast.success("기록이 삭제되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("기록 삭제에 실패했습니다.");
      }
    }
  };

  if (!entry) return null;

  const typeLabel = entry.type === "expense" ? "지출" : "수입";
  const typeVariant = entry.type === "expense" ? "default" : "secondary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            기록 삭제
          </DialogTitle>
          <DialogDescription>
            다음 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 삭제 대상 정보 */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {entry.title || entry.categoryName || "미분류"}
            </span>
            <Badge variant={typeVariant}>{typeLabel}</Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>금액</span>
              <span className="font-medium text-foreground">
                {formatCurrency(entry.amount)}
              </span>
            </div>
            {entry.categoryName && (
              <div className="flex justify-between">
                <span>카테고리</span>
                <span>{entry.categoryName}</span>
              </div>
            )}
            {(entry.fromPaymentMethodName ||
              entry.fromAccountName ||
              entry.toAccountName) && (
              <div className="flex justify-between">
                <span>
                  {entry.type === "expense" ? "결제 방법" : "입금 계좌"}
                </span>
                <span>
                  {entry.fromPaymentMethodName ||
                    entry.fromAccountName ||
                    entry.toAccountName}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>날짜</span>
              <span>
                {new Date(entry.transactedAt).toLocaleDateString("ko-KR")}
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
