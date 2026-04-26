"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { icons } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CURATED_ICON_GROUPS } from "@/lib/constants/category-icons";
import { cn } from "@/lib/utils/cn";
import type { Category, CategoryType } from "@/types";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "카테고리명을 입력해주세요.")
    .max(20, "카테고리명은 20자 이내여야 합니다."),
  icon: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CategoryType;
  mode: "create" | "edit";
  category?: Category;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  type,
  mode,
  category,
}: CategoryFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      icon: null,
    },
  });

  const watchIcon = watch("icon");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && category) {
        reset({
          name: category.name,
          icon: category.icon,
        });
      } else {
        reset({
          name: "",
          icon: null,
        });
      }
    }
  }, [open, mode, category, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          type,
          name: data.name,
          icon: data.icon,
        });
        toast.success("카테고리가 추가되었습니다.");
      } else if (category) {
        await updateMutation.mutateAsync({
          id: category.id,
          name: data.name,
          icon: data.icon,
        });
        toast.success("카테고리가 수정되었습니다.");
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(
          mode === "create"
            ? "카테고리 추가에 실패했습니다."
            : "카테고리 수정에 실패했습니다.",
        );
      }
    }
  };

  const title = mode === "create" ? "카테고리 추가" : "카테고리 수정";
  const typeLabel = type === "expense" ? "지출" : "수입";
  const isPending = createMutation.isPending || updateMutation.isPending;

  const iconPicker = (
    <div className="space-y-4 max-h-[240px] overflow-y-auto">
      {CURATED_ICON_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs text-gray-500 font-medium mb-2">
            {group.label}
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {group.icons.map((iconName) => {
              const LucideIcon = icons[iconName as keyof typeof icons] ?? null;
              if (!LucideIcon) return null;

              const isSelected = watchIcon === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setValue("icon", isSelected ? null : iconName)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
                    isSelected
                      ? "bg-primary text-white ring-2 ring-primary/30"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                  )}
                  aria-label={iconName}
                >
                  <LucideIcon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const formFields = (
    <>
      {/* 카테고리명 */}
      <div className="space-y-2">
        <Label htmlFor="category-name">카테고리명 *</Label>
        <Input
          id="category-name"
          placeholder="예: 반려동물, 육아"
          maxLength={20}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* 선택된 아이콘 미리보기 */}
      <div className="space-y-2">
        <Label>아이콘 선택</Label>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CategoryIcon
              iconName={watchIcon}
              className="w-5 h-5 text-primary"
            />
          </div>
          <span className="text-sm text-gray-500">
            {watchIcon ? watchIcon : "기본 아이콘"}
          </span>
        </div>
        {iconPicker}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{typeLabel} 카테고리</DialogDescription>
          </DialogHeader>

          <form
            id="category-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {formFields}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending || isSubmitting}>
                {isPending ? "저장 중..." : mode === "create" ? "추가" : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // 모바일: Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{typeLabel} 카테고리</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form
            id="category-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pb-2"
          >
            {formFields}
          </form>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="category-form"
              disabled={isPending || isSubmitting}
              className="flex-1"
            >
              {isPending ? "저장 중..." : mode === "create" ? "추가" : "저장"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
