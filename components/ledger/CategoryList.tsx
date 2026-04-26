"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  LockIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryDeleteDialog } from "@/components/ledger/CategoryDeleteDialog";
import { CategoryFormDialog } from "@/components/ledger/CategoryFormDialog";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCategories, useReorderCategories } from "@/hooks/use-categories";
import type { Category, CategoryType } from "@/types";

interface CategoryListProps {
  activeTab: CategoryType;
  onTabChange: (tab: CategoryType) => void;
}

export function CategoryList({ activeTab, onTabChange }: CategoryListProps) {
  const { data: categories = [], isLoading } = useCategories(activeTab);
  const reorderMutation = useReorderCategories();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [
      newCategories[index],
      newCategories[index - 1],
    ];

    const orders = newCategories.map((cat, i) => ({
      id: cat.id,
      displayOrder: i,
    }));

    try {
      await reorderMutation.mutateAsync(orders);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("순서 변경에 실패했습니다.");
      }
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return;

    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [
      newCategories[index + 1],
      newCategories[index],
    ];

    const orders = newCategories.map((cat, i) => ({
      id: cat.id,
      displayOrder: i,
    }));

    try {
      await reorderMutation.mutateAsync(orders);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("순서 변경에 실패했습니다.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 탭 전환 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTabChange("expense")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            activeTab === "expense"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          지출
        </button>
        <button
          type="button"
          onClick={() => onTabChange("income")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            activeTab === "income"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          수입
        </button>
      </div>

      {/* 카테고리 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            {activeTab === "expense" ? "지출" : "수입"} 카테고리가 없습니다.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            상단의 &quot;카테고리 추가&quot; 버튼으로 추가해보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm"
            >
              {/* 아이콘 */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CategoryIcon
                  iconName={category.icon}
                  className="w-5 h-5 text-primary"
                />
              </div>

              {/* 이름 + 뱃지 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {category.name}
                  </span>
                  {category.is_system && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      기본
                    </Badge>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-1 shrink-0">
                {category.is_system ? (
                  <LockIcon className="w-4 h-4 text-gray-300" />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || reorderMutation.isPending}
                      aria-label="위로 이동"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveDown(index)}
                      disabled={
                        index === categories.length - 1 ||
                        reorderMutation.isPending
                      }
                      aria-label="아래로 이동"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget(category)}
                      aria-label="수정"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(category)}
                      aria-label="삭제"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 수정 다이얼로그 */}
      <CategoryFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        type={activeTab}
        mode="edit"
        category={editTarget ?? undefined}
      />

      {/* 삭제 다이얼로그 */}
      <CategoryDeleteDialog
        category={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
