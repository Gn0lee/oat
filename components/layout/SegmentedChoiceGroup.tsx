"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedChoiceOption<T extends string> {
  value: T;
  label: string;
  selectedClassName?: string;
}

interface SegmentedChoiceGroupProps<T extends string> {
  value: T;
  options: readonly SegmentedChoiceOption<T>[];
  onValueChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function SegmentedChoiceGroup<T extends string>({
  value,
  options,
  onValueChange,
  columns,
  className,
}: SegmentedChoiceGroupProps<T>) {
  const columnCount = columns ?? options.length;

  return (
    <div
      className={cn(
        "grid gap-2",
        columnCount === 2 && "grid-cols-2",
        columnCount === 3 && "grid-cols-3",
        columnCount === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "h-11 rounded-xl px-3 font-medium text-sm transition-colors",
              selected
                ? (option.selectedClassName ?? "bg-primary text-white")
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
