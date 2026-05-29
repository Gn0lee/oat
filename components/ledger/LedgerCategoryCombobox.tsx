"use client";

import { ArrowLeftIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/types";

interface LedgerCategoryBaseProps {
  value: string;
  categories: Category[];
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
}: {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <CommandList className="max-h-[320px]">
      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
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

export function LedgerCategoryCombobox({
  value,
  categories,
  placeholder,
  onValueChange,
}: LedgerCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedCategory = categories.find((cat) => cat.id === value);
  const selectedLabel = selectedCategory ? selectedCategory.name : placeholder;

  const handleValueChange = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
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
          <CommandInput placeholder="카테고리 이름 검색" />
          <CategoryCommandList
            categories={categories}
            value={value}
            onValueChange={handleValueChange}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LedgerCategoryPickerPanel({
  value,
  categories,
  title,
  searchPlaceholder,
  onBack,
  onValueChange,
}: LedgerCategoryPickerPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-4 pb-3">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-5" />
            <span className="sr-only">돌아가기</span>
          </Button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 px-4">
        <Command className="h-full rounded-xl border">
          <CommandInput placeholder={searchPlaceholder} className="h-11" />
          <CategoryCommandList
            categories={categories}
            value={value}
            onValueChange={onValueChange}
          />
        </Command>
      </div>
    </div>
  );
}
