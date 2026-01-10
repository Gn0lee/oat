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
import { useDeleteAccount } from "@/hooks/use-accounts";
import type { AccountWithOwner } from "@/lib/api/account";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  stock: "일반",
  isa: "ISA",
  pension: "연금저축",
  cma: "CMA",
};

interface AccountDeleteDialogProps {
  account: AccountWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDeleteDialog({
  account,
  open,
  onOpenChange,
}: AccountDeleteDialogProps) {
  const deleteMutation = useDeleteAccount();

  const handleDelete = async () => {
    if (!account) return;

    try {
      await deleteMutation.mutateAsync(account.id);
      toast.success(`${account.name} 계좌가 삭제되었습니다.`);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("계좌 삭제에 실패했습니다.");
      }
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            계좌 삭제
          </DialogTitle>
          <DialogDescription>
            다음 계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{account.name}</span>
            {account.isDefault && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                기본
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {account.broker && (
              <div className="flex justify-between">
                <span>증권사/은행</span>
                <span>{account.broker}</span>
              </div>
            )}
            {account.accountType && (
              <div className="flex justify-between">
                <span>계좌 유형</span>
                <span>
                  {ACCOUNT_TYPE_LABELS[account.accountType] ||
                    account.accountType}
                </span>
              </div>
            )}
            {account.accountNumber && (
              <div className="flex justify-between">
                <span>계좌번호</span>
                <span>{account.accountNumber}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          이 계좌에 연결된 거래 내역은 삭제되지 않고 계좌 정보만 제거됩니다.
        </p>

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
