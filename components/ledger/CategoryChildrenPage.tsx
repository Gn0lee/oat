"use client";

import {
  LockIcon,
  MoreHorizontal,
  PencilIcon,
  Plus,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { CategoryDeleteDialog } from "@/components/ledger/CategoryDeleteDialog";
import { CategoryFormDialog } from "@/components/ledger/CategoryFormDialog";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import type { Category } from "@/types";

export function CategoryChildrenPage({ parent }: { parent: Category }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const { data: children = [], isLoading } = useCategories(
    parent.type,
    parent.id,
  );

  return (
    <ScreenSection>
      <SectionHeader
        title={parent.name}
        description="세부 카테고리 관리"
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 size-4" />
            세부 카테고리 추가
          </Button>
        }
      />

      {isLoading ? (
        <GroupedList>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static
              key={i}
              className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </GroupedList>
      ) : children.length === 0 ? (
        <ScreenState
          type="empty"
          title="등록된 세부 카테고리가 없습니다."
          description="세부 카테고리를 추가하여 더 자세히 분류해보세요."
        />
      ) : (
        <GroupedList>
          {children.map((category) => (
            <article
              key={category.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    category.is_system
                      ? "bg-gray-100 text-gray-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <CategoryIcon iconName={category.icon} className="size-5" />
                </div>
                <span className="truncate text-sm font-semibold text-gray-900">
                  {category.name}
                </span>
              </div>

              {category.is_system ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Badge
                    variant="outline"
                    className="h-5 border-gray-200 px-1.5 py-0 text-[10px] text-gray-400"
                  >
                    기본
                  </Badge>
                  <div className="flex size-9 items-center justify-center">
                    <LockIcon className="size-4" />
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label="메뉴 열기"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(category)}>
                      <PencilIcon className="mr-2 size-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500 focus:bg-red-50 focus:text-red-500"
                      onClick={() => setDeleteTarget(category)}
                    >
                      <Trash2Icon className="mr-2 size-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </article>
          ))}
        </GroupedList>
      )}

      <CategoryFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        type={parent.type}
        mode="create"
        parentId={parent.id}
        parentName={parent.name}
      />

      <CategoryFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        type={parent.type}
        mode="edit"
        category={editTarget ?? undefined}
        parentId={parent.id}
        parentName={parent.name}
      />

      <CategoryDeleteDialog
        category={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </ScreenSection>
  );
}
