"use client";

import { LockIcon, PencilIcon, Plus, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CategoryDeleteDialog } from "@/components/ledger/CategoryDeleteDialog";
import { CategoryFormDialog } from "@/components/ledger/CategoryFormDialog";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
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

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤은 순서 변경 없음
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 gap-x-2 gap-y-5 pt-4">
        {categories.map((category) =>
          category.is_system ? (
            <SystemCategoryItem key={category.id} category={category} />
          ) : (
            <CustomCategoryItem
              key={category.id}
              category={category}
              onEdit={() => setEditTarget(category)}
              onDelete={() => setDeleteTarget(category)}
            />
          ),
        )}

        {/* 추가 버튼 */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="size-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary/60 transition-colors" />
          </div>
          <span className="text-xs text-gray-400">추가</span>
        </button>
      </div>
    );
  };

  return (
    <>
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
        <TabsContent value="expense">{renderGrid()}</TabsContent>
        <TabsContent value="income">{renderGrid()}</TabsContent>
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
    </>
  );
}

function SystemCategoryItem({ category }: { category: Category }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="size-16">
        <AvatarFallback className="bg-gray-100">
          <CategoryIcon
            iconName={category.icon}
            className="w-7 h-7 text-gray-500"
          />
        </AvatarFallback>
        <AvatarBadge className="size-5 bg-white ring-gray-200 [&>svg]:size-3">
          <LockIcon />
        </AvatarBadge>
      </Avatar>
      <span className="text-xs text-gray-600 text-center w-full truncate px-1">
        {category.name}
      </span>
    </div>
  );
}

interface CustomCategoryItemProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomCategoryItem({
  category,
  onEdit,
  onDelete,
}: CustomCategoryItemProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-2 group outline-none"
        >
          <Avatar className="size-16 group-hover:opacity-75 transition-opacity">
            <AvatarFallback className="bg-primary/10">
              <CategoryIcon
                iconName={category.icon}
                className="w-7 h-7 text-primary"
              />
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-700 text-center w-full truncate px-1">
            {category.name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon className="w-4 h-4 mr-2" />
          수정
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-500 focus:text-red-500 focus:bg-red-50"
          onClick={onDelete}
        >
          <Trash2Icon className="w-4 h-4 mr-2" />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
