"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComposerExitDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** 다이얼로그가 닫힌 뒤 포커스를 돌려줄 요소 */
  focusRef: RefObject<HTMLElement | null>;
}

export function ComposerExitDialog({
  open,
  onCancel,
  onConfirm,
  focusRef,
}: ComposerExitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => focusRef.current?.focus());
        }}
      >
        <DialogHeader>
          <DialogTitle>입력 중인 내용을 버릴까요?</DialogTitle>
          <DialogDescription>
            저장하지 않은 내용은 사라집니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            계속 입력
          </Button>
          <Button type="button" onClick={onConfirm}>
            내용 버리기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
