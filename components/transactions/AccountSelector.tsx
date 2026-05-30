"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAccounts } from "@/hooks/use-accounts";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

interface AccountSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
  variant?: "card" | "inline";
  placeholder?: string;
  allowClear?: boolean;
  onChange?: (value: string) => void;
}

interface AccountSelectorTriggerProps
  extends ComponentPropsWithoutRef<typeof Button> {
  label: string;
  placeholder: string;
  open?: boolean;
}

export const AccountSelectorTrigger = forwardRef<
  HTMLButtonElement,
  AccountSelectorTriggerProps
>(function AccountSelectorTrigger(
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
        "h-11 w-full justify-between px-3 font-normal rounded-xl",
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

function AccountCommandList({
  accounts,
  value,
  allowClear,
  onValueChange,
  className,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: accounts type from useAccounts
  accounts: any[];
  value: string;
  allowClear: boolean;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <CommandList className={cn("max-h-[320px]", className)}>
      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
      <CommandGroup heading="계좌 선택">
        {allowClear && (
          <CommandItem
            value="DEFAULT"
            onSelect={() => onValueChange("DEFAULT")}
            className="cursor-pointer py-2.5"
          >
            <CheckIcon
              className={cn(
                "size-4 mr-2",
                value === "DEFAULT" || !value ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="font-medium text-gray-500">기본 계좌 사용</span>
          </CommandItem>
        )}
        {accounts.map((account) => (
          <CommandItem
            key={account.id}
            value={account.name}
            onSelect={() => onValueChange(account.id)}
            className="cursor-pointer py-2.5"
          >
            <CheckIcon
              className={cn(
                "size-4 mr-2",
                value === account.id ? "opacity-100" : "opacity-0",
              )}
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-medium">{account.name}</span>
              {account.broker && (
                <span className="truncate text-xs text-muted-foreground">
                  {account.broker}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}

export function AccountSelector<T extends FieldValues>({
  control,
  name = "accountId" as Path<T>,
  variant = "card",
  placeholder,
  allowClear = false,
  onChange,
}: AccountSelectorProps<T>) {
  const { data: accounts = [], isLoading } = useAccounts();
  const { field } = useController({
    control,
    name,
  });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  const wrap = (
    children: React.ComponentPropsWithoutRef<"div">["children"],
  ) => {
    if (variant === "inline") {
      return <div className="space-y-2">{children}</div>;
    }
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        {children}
      </div>
    );
  };

  if (isLoading) {
    return wrap(
      <>
        <Label className="text-gray-700">거래 계좌</Label>
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </>,
    );
  }

  if (!accounts || accounts.length === 0) {
    return wrap(
      <>
        <Label className="text-gray-700">거래 계좌</Label>
        <div className="text-center py-4 space-y-3">
          <p className="text-gray-500 text-sm">
            거래를 등록하려면 계좌가 필요합니다.
          </p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/assets/accounts/new?returnUrl=/assets/stock/transactions/new/full">
              <PlusCircle className="w-4 h-4 mr-2" />
              계좌 추가하기
            </Link>
          </Button>
        </div>
      </>,
    );
  }

  const selectedAccount = accounts.find((acc) => acc.id === field.value);
  const triggerPlaceholder = placeholder ?? "계좌를 선택하세요";
  const triggerLabel = selectedAccount
    ? `${selectedAccount.name}${selectedAccount.broker ? ` (${selectedAccount.broker})` : ""}`
    : allowClear && (field.value === "DEFAULT" || !field.value)
      ? "기본 계좌 사용"
      : triggerPlaceholder;

  const handleSelect = (val: string) => {
    const nextVal = val === "DEFAULT" ? undefined : val;
    field.onChange(nextVal);
    if (onChange) {
      onChange(nextVal ?? "");
    }
    setOpen(false);
  };

  const desktopContent = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AccountSelectorTrigger
          label={triggerLabel}
          placeholder={triggerPlaceholder}
          open={open}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="계좌명, 증권사 검색" />
          <AccountCommandList
            accounts={accounts}
            value={field.value ?? ""}
            allowClear={allowClear}
            onValueChange={handleSelect}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );

  const mobileContent = (
    <>
      <AccountSelectorTrigger
        label={triggerLabel}
        placeholder={triggerPlaceholder}
        onClick={() => setOpen(true)}
      />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>계좌 선택</DrawerTitle>
            <DrawerDescription>
              거래 계좌를 선택하고 검색해보세요.
            </DrawerDescription>
          </DrawerHeader>
          <Command className="h-full">
            <CommandInput placeholder="계좌명, 증권사 검색" />
            <AccountCommandList
              accounts={accounts}
              value={field.value ?? ""}
              allowClear={allowClear}
              onValueChange={handleSelect}
              className="max-h-none min-h-0 flex-1"
            />
          </Command>
        </DrawerContent>
      </Drawer>
    </>
  );

  return wrap(
    <>
      <Label className="text-gray-700">거래 계좌</Label>
      {isDesktop ? desktopContent : mobileContent}
    </>,
  );
}
