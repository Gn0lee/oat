"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
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
  className,
}: {
  groups: LedgerMoneySourceGroup[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <CommandList className={cn("max-h-[320px]", className)}>
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
  searchPlaceholder,
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
    <Command className="h-full">
      <CommandInput placeholder={searchPlaceholder} />
      <MoneySourceCommandList
        groups={groups}
        value={value}
        onValueChange={onValueChange}
        className="max-h-none min-h-0 flex-1"
      />
    </Command>
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
