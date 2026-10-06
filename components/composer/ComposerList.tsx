"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ComposerListProps {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit: () => void;
  /** ComposerListRow 목록 */
  children: ReactNode;
  /** 목록 아래에 붙는 확인 Dialog 등 */
  footer?: ReactNode;
}

/** 데스크톱 컴포저의 압축 목록 틀: 제목·추가, 행 목록, 모두 저장 */
export function ComposerList({
  title,
  description,
  addLabel,
  onAdd,
  submitLabel,
  submitDisabled,
  onSubmit,
  children,
  footer,
}: ComposerListProps) {
  return (
    <div className="space-y-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-[12px]"
          onClick={onAdd}
        >
          <Plus className="mr-2 size-4" />
          {addLabel}
        </Button>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card text-foreground">
        {children}
      </div>
      <Button
        type="button"
        className="min-h-12 w-full rounded-[12px]"
        disabled={submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
      {footer}
    </div>
  );
}

interface ComposerListRowProps {
  onEdit: () => void;
  deleteLabel: string;
  onDelete: () => void;
  /** 행 요약(편집 버튼 안) */
  children: ReactNode;
  /** 삭제 버튼 앞에 붙는 값(금액 등) */
  trailing?: ReactNode;
}

export function ComposerListRow({
  onEdit,
  deleteLabel,
  onDelete,
  children,
  trailing,
}: ComposerListRowProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      <button
        type="button"
        onClick={onEdit}
        className="min-h-16 min-w-0 flex-1 rounded-[12px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {children}
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <Button
          type="button"
          variant="ghost"
          aria-label={deleteLabel}
          className="size-11 p-0"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
