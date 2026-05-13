"use client";

import { ArrowLeftIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useMemo, useState } from "react";
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
import {
  buildLedgerMoneySourceGroups,
  type LedgerMoneySourceAccount,
  type LedgerMoneySourceGroup,
  type LedgerMoneySourceMode,
  type LedgerMoneySourcePaymentMethod,
} from "@/lib/ledger/money-source-options";
import { cn } from "@/lib/utils/cn";

interface LedgerMoneySourceBaseProps {
  mode: LedgerMoneySourceMode;
  value: string;
  paymentMethods: LedgerMoneySourcePaymentMethod[];
  accounts: LedgerMoneySourceAccount[];
  includeClearOption?: boolean;
  excludedValues?: string[];
}

interface LedgerMoneySourceComboboxProps extends LedgerMoneySourceBaseProps {
  placeholder: string;
  onValueChange: (value: string) => void;
}

interface LedgerMoneySourcePickerPanelProps extends LedgerMoneySourceBaseProps {
  title: string;
  searchPlaceholder: string;
  onBack?: () => void;
  onValueChange: (value: string) => void;
}

interface LedgerMoneySourceTriggerProps
  extends ComponentPropsWithoutRef<typeof Button> {
  label: string;
  placeholder: string;
  open?: boolean;
}

interface GetLedgerMoneySourceLabelParams extends LedgerMoneySourceBaseProps {
  placeholder: string;
}

function findSelectedLabel(
  groups: LedgerMoneySourceGroup[],
  value: string,
): string | null {
  for (const group of groups) {
    const option = group.options.find((item) => item.value === value);
    if (option) return option.label;
  }
  return null;
}

function useMoneySourceGroups({
  mode,
  paymentMethods,
  accounts,
  includeClearOption = true,
  excludedValues = [],
}: LedgerMoneySourceBaseProps): LedgerMoneySourceGroup[] {
  return useMemo(() => {
    const excluded = new Set(excludedValues);
    return buildLedgerMoneySourceGroups({
      mode,
      paymentMethods,
      accounts,
      includeClearOption,
    })
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => !excluded.has(option.value)),
      }))
      .filter((group) => group.options.length > 0);
  }, [mode, paymentMethods, accounts, includeClearOption, excludedValues]);
}

export const LedgerMoneySourceTrigger = forwardRef<
  HTMLButtonElement,
  LedgerMoneySourceTriggerProps
>(function LedgerMoneySourceTrigger(
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
      className={cn("h-9 w-full justify-between px-3 font-normal", className)}
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

function MoneySourceCommandList({
  groups,
  value,
  onValueChange,
}: {
  groups: LedgerMoneySourceGroup[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <CommandList className="max-h-[320px]">
      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
      {groups.map((group) => (
        <CommandGroup key={group.label} heading={group.label}>
          {group.options.map((option) => (
            <CommandItem
              key={`${option.kind}:${option.id}`}
              value={option.searchValue}
              onSelect={() => onValueChange(option.value)}
              className="cursor-pointer py-2.5"
            >
              <CheckIcon
                className={cn(
                  "size-4",
                  value === option.value ? "opacity-100" : "opacity-0",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{option.label}</p>
                {option.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {option.description}
                  </p>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  );
}

export function LedgerMoneySourceCombobox({
  mode,
  value,
  paymentMethods,
  accounts,
  includeClearOption = true,
  excludedValues,
  placeholder,
  onValueChange,
}: LedgerMoneySourceComboboxProps) {
  const [open, setOpen] = useState(false);
  const groups = useMoneySourceGroups({
    mode,
    value,
    paymentMethods,
    accounts,
    includeClearOption,
    excludedValues,
  });
  const selectedLabel = findSelectedLabel(groups, value) ?? placeholder;

  const handleValueChange = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <LedgerMoneySourceTrigger
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
          <CommandInput placeholder="이름, 기관, 소유자 검색" />
          <MoneySourceCommandList
            groups={groups}
            value={value}
            onValueChange={handleValueChange}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LedgerMoneySourcePickerPanel({
  mode,
  value,
  paymentMethods,
  accounts,
  includeClearOption = true,
  excludedValues,
  title,
  searchPlaceholder,
  onBack,
  onValueChange,
}: LedgerMoneySourcePickerPanelProps) {
  const groups = useMoneySourceGroups({
    mode,
    value,
    paymentMethods,
    accounts,
    includeClearOption,
    excludedValues,
  });

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
          <MoneySourceCommandList
            groups={groups}
            value={value}
            onValueChange={onValueChange}
          />
        </Command>
      </div>
    </div>
  );
}

export function getLedgerMoneySourceLabel({
  mode,
  value,
  paymentMethods,
  accounts,
  includeClearOption = true,
  excludedValues = [],
  placeholder,
}: GetLedgerMoneySourceLabelParams): string {
  const excluded = new Set(excludedValues);
  const groups = buildLedgerMoneySourceGroups({
    mode,
    paymentMethods,
    accounts,
    includeClearOption,
  }).map((group) => ({
    ...group,
    options: group.options.filter((option) => !excluded.has(option.value)),
  }));
  return findSelectedLabel(groups, value) ?? placeholder;
}
