"use client";

import {
  LockIcon,
  MoreHorizontal,
  PencilIcon,
  Plus,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/use-categories";
import type { Category, CategoryType } from "@/types";

export function CategoryList() {
  const [activeTab, setActiveTab] = useState<CategoryType>("expense");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useCategories(activeTab);
  const parentCategories = categories.filter((category) => !category.parent_id);

  const renderList = () => {
    if (isLoading) {
      return (
        <GroupedList>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤은 순서 변경 없음
              key={i}
              className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <Skeleton className="size-10 rounded-full shrink-0" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </GroupedList>
      );
    }

    if (parentCategories.length === 0) {
      return (
        <ScreenState
          type="empty"
          title="등록된 카테고리가 없습니다."
          description="카테고리를 추가하여 거래를 분류해보세요."
        />
      );
    }

    return (
      <GroupedList>
        {parentCategories.map((category) => (
          <article
            key={category.id}
            className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
          >
            <Link
              href={`/ledger/categories/${category.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  category.is_system
                    ? "bg-gray-100 text-gray-500"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <CategoryIcon iconName={category.icon} className="size-5" />
              </div>
              <span className="font-semibold text-gray-900 text-sm truncate">
                {category.name}
              </span>
              <span className="ml-auto hidden text-xs text-gray-400 sm:inline">
                세부 카테고리 관리
              </span>
            </Link>

            {category.is_system ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Badge
                  variant="outline"
                  className="text-gray-400 border-gray-200 text-[10px] px-1.5 py-0 h-5"
                >
                  기본
                </Badge>
                <div className="flex size-9 items-center justify-center">
                  <LockIcon data-testid="lock-icon" className="size-4" />
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
                    <PencilIcon className="w-4 h-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    onClick={() => setDeleteTarget(category)}
                  >
                    <Trash2Icon className="w-4 h-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </article>
        ))}
      </GroupedList>
    );
  };

  return (
    <ScreenSection>
      <SectionHeader
        title="카테고리"
        description="상위 카테고리를 선택해 세부 카테고리를 관리할 수 있습니다."
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 size-4" />
            추가
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CategoryType)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">
            지출
          </TabsTrigger>
          <TabsTrigger value="income" className="flex-1">
            수입
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4">
          {renderList()}
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          {renderList()}
        </TabsContent>
      </Tabs>

      <CategoryFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        type={activeTab}
        mode="create"
      />

      <CategoryFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        type={activeTab}
        mode="edit"
        category={editTarget ?? undefined}
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
