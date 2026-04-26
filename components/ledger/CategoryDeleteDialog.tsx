"use client";

import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
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
import { useDeleteCategory } from "@/hooks/use-categories";
import type { Category } from "@/types";

interface CategoryDeleteDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDeleteDialog({
  category,
  open,
  onOpenChange,
}: CategoryDeleteDialogProps) {
  const deleteMutation = useDeleteCategory();

  const handleDelete = async () => {
    if (!category) return;

    try {
      await deleteMutation.mutateAsync(category.id);
      toast.success("카테고리가 삭제되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("카테고리 삭제에 실패했습니다.");
      }
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            카테고리 삭제
          </DialogTitle>
          <DialogDescription>
            이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 삭제 대상 정보 */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CategoryIcon
                iconName={category.icon}
                className="w-5 h-5 text-primary"
              />
            </div>
            <div>
              <span className="font-medium text-gray-900">{category.name}</span>
              <div className="mt-0.5">
                <Badge variant="secondary" className="text-[10px]">
                  {category.type === "expense" ? "지출" : "수입"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          이 카테고리에 연결된 기록이 있다면, 해당 기록의 카테고리가
          &quot;미분류&quot;로 변경됩니다.
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
