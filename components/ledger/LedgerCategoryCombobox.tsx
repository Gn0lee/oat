"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, FormEvent } from "react";
import { forwardRef, useEffect, useState } from "react";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreateCategory } from "@/hooks/use-categories";
import { cn } from "@/lib/utils/cn";
import type { Category, CategoryType } from "@/types";

interface LedgerCategoryBaseProps {
  value: string;
  categories: Category[];
  type?: CategoryType;
}

interface LedgerCategoryComboboxProps extends LedgerCategoryBaseProps {
  placeholder: string;
  onValueChange: (value: string) => void;
}

interface LedgerCategoryPickerPanelProps extends LedgerCategoryBaseProps {
  title: string;
  searchPlaceholder: string;
  onBack?: () => void;
  onValueChange: (value: string) => void;
}

interface LedgerCategoryTriggerProps
  extends ComponentPropsWithoutRef<typeof Button> {
  label: string;
  placeholder: string;
  open?: boolean;
}

export const LedgerCategoryTrigger = forwardRef<
  HTMLButtonElement,
  LedgerCategoryTriggerProps
>(function LedgerCategoryTrigger(
  { label, placeholder, open, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "h-10 w-full justify-between px-3 font-normal rounded-xl",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "truncate",
          label === placeholder && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  );
});

function CategoryCommandList({
  categories,
  value,
  onValueChange,
  createLabel,
  onCreate,
  className,
}: {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  createLabel?: string;
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <CommandList className={cn("max-h-[320px]", className)}>
      <CommandEmpty>
        <div className="space-y-3">
          <p>검색 결과가 없습니다.</p>
          {createLabel && onCreate && (
            <Button type="button" variant="ghost" size="sm" onClick={onCreate}>
              <PlusIcon className="size-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </CommandEmpty>
      <CommandGroup heading="카테고리 선택">
        {categories.map((category) => (
          <CommandItem
            key={category.id}
            value={category.name}
            onSelect={() => onValueChange(category.id)}
            className="cursor-pointer py-2.5"
          >
            <CheckIcon
              className={cn(
                "size-4 mr-2",
                value === category.id ? "opacity-100" : "opacity-0",
              )}
            />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CategoryIcon
                iconName={category.icon}
                className="size-4 text-gray-500 shrink-0"
              />
              <span className="truncate font-medium">{category.name}</span>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}

function InlineCategoryCreateDialog({
  open,
  initialName,
  type,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  type: CategoryType;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: Category) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>새 카테고리</DialogTitle>
          <DialogDescription className="sr-only">
            기록 입력 중 사용할 카테고리를 추가합니다.
          </DialogDescription>
        </DialogHeader>
        <CategoryInlineCreateForm
          initialName={initialName}
          type={type}
          onCreated={(category) => {
            onCreated(category);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryInlineCreateForm({
  initialName,
  type,
  onBack,
  onCreated,
}: {
  initialName: string;
  type: CategoryType;
  onBack?: () => void;
  onCreated: (category: Category) => void;
}) {
  const createCategory = useCreateCategory();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setError(null);
  }, [initialName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("카테고리명을 입력해주세요.");
      return;
    }

    try {
      const category = await createCategory.mutateAsync({
        type,
        name: trimmedName,
        icon: null,
      });
      onCreated(category);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "카테고리 추가에 실패했습니다.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inline-category-name">카테고리명</Label>
        <Input
          id="inline-category-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          maxLength={20}
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter className="gap-2">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            이전
          </Button>
        )}
        <Button
          type="submit"
          disabled={createCategory.isPending}
          className="w-full sm:w-auto"
        >
          {createCategory.isPending ? "추가 중..." : "추가"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LedgerCategoryCombobox({
  value,
  categories,
  type = "expense",
  placeholder,
  onValueChange,
}: LedgerCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const selectedCategory = categories.find((cat) => cat.id === value);
  const selectedLabel = selectedCategory ? selectedCategory.name : placeholder;
  const createQuery = search.trim();
  const createLabel = createQuery
    ? `"${createQuery}" 새 카테고리 추가`
    : undefined;

  const handleValueChange = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  const handleCreateClick = () => {
    if (!createQuery) return;
    setCreateInitialName(createQuery);
    setOpen(false);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <LedgerCategoryTrigger
            label={selectedLabel}
            placeholder={placeholder}
            open={open}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput
              placeholder="카테고리 이름 검색"
              value={search}
              onValueChange={setSearch}
              endAdornment={
                createLabel ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={createLabel}
                    onClick={handleCreateClick}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                ) : null
              }
            />
            <CategoryCommandList
              categories={categories}
              value={value}
              createLabel={createLabel}
              onCreate={handleCreateClick}
              onValueChange={handleValueChange}
            />
          </Command>
        </PopoverContent>
      </Popover>
      <InlineCategoryCreateDialog
        open={createDialogOpen}
        initialName={createInitialName}
        type={type}
        onOpenChange={setCreateDialogOpen}
        onCreated={(category) => onValueChange(category.id)}
      ></InlineCategoryCreateDialog>
    </>
  );
}

export function LedgerCategoryPickerPanel({
  value,
  categories,
  type = "expense",
  searchPlaceholder,
  onValueChange,
}: LedgerCategoryPickerPanelProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"select" | "create">("select");
  const shouldReduceMotion = useReducedMotion();
  const [createInitialName, setCreateInitialName] = useState("");
  const createQuery = search.trim();
  const createLabel = createQuery
    ? `"${createQuery}" 새 카테고리 추가`
    : undefined;

  const handleCreateClick = () => {
    if (!createQuery) return;
    setCreateInitialName(createQuery);
    setView("create");
  };

  const handleBackToSelect = () => {
    setView("select");
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-clip w-full h-full"
      style={{ overflow: "clip" }}
    >
      <motion.div
        animate={{ x: view === "create" ? "-100%" : "0%" }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }
        }
        className="flex h-full w-full"
      >
        <div className="w-full h-full shrink-0 min-w-0">
          <Command className="h-full">
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              wrapperClassName="h-14 px-4"
              endAdornment={
                createLabel ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={createLabel}
                    onClick={handleCreateClick}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                ) : null
              }
            />
            <CategoryCommandList
              categories={categories}
              value={value}
              createLabel={createLabel}
              onCreate={handleCreateClick}
              onValueChange={onValueChange}
              className="max-h-none min-h-0 flex-1"
            />
          </Command>
        </div>
        <div className="w-full h-full shrink-0 min-w-0">
          <div className="flex h-full flex-col">
            <div className="flex h-14 shrink-0 items-center border-b px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="카테고리 선택으로 돌아가기"
                onClick={handleBackToSelect}
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
              <h2 className="text-base font-semibold">새 카테고리</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <CategoryInlineCreateForm
                initialName={createInitialName}
                type={type}
                onCreated={(category) => onValueChange(category.id)}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
