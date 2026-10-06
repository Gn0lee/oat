"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComposerEditDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** 데스크톱 컴포저에서 한 행을 편집하는 Dialog 틀 */
export function ComposerEditDialog({
  open,
  onClose,
  children,
}: ComposerEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[95dvh] overflow-y-auto p-0 sm:max-w-xl">
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface ComposerEditFormProps {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

/** 편집 Dialog 본문: 제목·취소, 필드, 완료 버튼 */
export function ComposerEditForm({
  title,
  description,
  onCancel,
  onConfirm,
  children,
}: ComposerEditFormProps) {
  return (
    <div className="max-h-[85dvh] overflow-y-auto p-5">
      <DialogDescription className="sr-only">{description}</DialogDescription>
      <div className="mb-5 flex items-center justify-between">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 rounded-[12px]"
          onClick={onCancel}
        >
          취소
        </Button>
      </div>
      <div className="space-y-5">
        {children}
        <Button
          type="button"
          className="min-h-12 w-full rounded-[12px]"
          onClick={onConfirm}
        >
          완료
        </Button>
      </div>
    </div>
  );
}

/**
 * Dialog를 연 시점의 행을 스냅샷으로 들고 있다가, 취소하면 그 상태로 되돌린다.
 * 행이 사라지면(index < 0) onMissing을 부른다.
 */
export function useComposerItemSnapshot<TItem>({
  item,
  index,
  restore,
  onMissing,
}: {
  item: TItem | undefined;
  index: number;
  restore: (snapshot: TItem) => void;
  onMissing: () => void;
}) {
  const [snapshot] = useState<TItem | undefined>(() =>
    item ? structuredClone(item) : undefined,
  );

  useEffect(() => {
    if (index < 0) onMissing();
  }, [index, onMissing]);

  return () => {
    if (snapshot) restore(snapshot);
  };
}
