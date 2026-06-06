"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronsUpDownIcon,
  PlusCircle,
  PlusIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, FormEvent } from "react";
import { forwardRef, useEffect, useState } from "react";
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
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAccounts, useCreateAccount } from "@/hooks/use-accounts";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { AccountWithOwner } from "@/lib/api/account";
import { cn } from "@/lib/utils/cn";
import type { Account } from "@/types";

interface AccountSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
  variant?: "card" | "inline";
  placeholder?: string;
  allowClear?: boolean;
  ownerId?: string | null;
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
  createLabel,
  onCreate,
  className,
}: {
  accounts: AccountWithOwner[];
  value: string;
  allowClear: boolean;
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
            value={[
              account.name,
              account.broker,
              account.ownerName,
              account.lastFour,
            ]
              .filter(Boolean)
              .join(" ")}
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
              <span className="truncate font-medium">
                {account.name}
                {account.lastFour ? ` (${account.lastFour})` : ""}
              </span>
              {(account.broker || account.ownerName) && (
                <span className="truncate text-xs text-muted-foreground">
                  {[
                    account.broker,
                    account.ownerName && `소유자: ${account.ownerName}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  );
}

function InvestmentAccountInlineCreateForm({
  initialName,
  onBack,
  onCreated,
  shouldFocus = false,
}: {
  initialName: string;
  onBack?: () => void;
  onCreated: (account: Account) => void;
  shouldFocus?: boolean;
}) {
  const createAccount = useCreateAccount();
  const [name, setName] = useState(initialName);
  const [broker, setBroker] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setBroker("");
    setError(null);
  }, [initialName]);

  useEffect(() => {
    if (shouldFocus) {
      const timer = setTimeout(() => {
        document.getElementById("inline-investment-account-name")?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("계좌명을 입력해주세요.");
      return;
    }

    try {
      const account = await createAccount.mutateAsync({
        name: trimmedName,
        broker: broker.trim() || undefined,
        category: "investment",
        accountType: "stock",
      });
      onCreated(account);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "계좌 추가에 실패했습니다.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inline-investment-account-name">계좌명</Label>
        <Input
          id="inline-investment-account-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inline-investment-account-broker">증권사</Label>
        <Input
          id="inline-investment-account-broker"
          value={broker}
          onChange={(event) => setBroker(event.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            이전
          </Button>
        )}
        <Button type="submit" disabled={createAccount.isPending}>
          {createAccount.isPending ? "추가 중..." : "추가"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function InvestmentAccountCreateDialog({
  open,
  initialName,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (account: Account) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>새 투자 계좌</DialogTitle>
          <DialogDescription className="sr-only">
            주식 거래 입력 중 사용할 투자 계좌를 추가합니다.
          </DialogDescription>
        </DialogHeader>
        <InvestmentAccountInlineCreateForm
          initialName={initialName}
          shouldFocus={open}
          onCreated={(account) => {
            onCreated(account);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AccountSelector<T extends FieldValues>({
  control,
  name = "accountId" as Path<T>,
  variant = "card",
  placeholder,
  allowClear = false,
  ownerId,
  onChange,
}: AccountSelectorProps<T>) {
  const { data: allAccounts = [], isLoading } = useAccounts();
  const accounts = ownerId
    ? allAccounts.filter((account) => account.ownerId === ownerId)
    : allAccounts;
  const { field } = useController({
    control,
    name,
  });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const createQuery = search.trim();
  const createLabel = createQuery
    ? `"${createQuery}" 새 투자 계좌 추가`
    : undefined;

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

  const handleCreateClick = () => {
    if (!createQuery) return;
    setCreateInitialName(createQuery);
    if (isDesktop) {
      setOpen(false);
      setCreateDialogOpen(true);
      return;
    }
    setMobileCreateOpen(true);
  };

  const handleCreated = (account: Account) => {
    field.onChange(account.id);
    if (onChange) {
      onChange(account.id);
    }
    setOpen(false);
    setMobileCreateOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
      setMobileCreateOpen(false);
    }
  };

  if (!accounts || accounts.length === 0) {
    return wrap(
      <>
        <Label className="text-gray-700">거래 계좌</Label>
        <div className="text-center py-4 space-y-3">
          <p className="text-gray-500 text-sm">
            거래를 등록하려면 계좌가 필요합니다.
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setCreateInitialName("");
              setCreateDialogOpen(true);
            }}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            계좌 추가하기
          </Button>
        </div>
        <InvestmentAccountCreateDialog
          open={createDialogOpen}
          initialName={createInitialName}
          onOpenChange={setCreateDialogOpen}
          onCreated={handleCreated}
        />
      </>,
    );
  }

  const desktopContent = (
    <>
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
            <CommandInput
              placeholder="계좌명, 증권사 검색"
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
            <AccountCommandList
              accounts={accounts}
              value={field.value ?? ""}
              allowClear={allowClear}
              createLabel={createLabel}
              onCreate={handleCreateClick}
              onValueChange={handleSelect}
            />
          </Command>
        </PopoverContent>
      </Popover>
      <InvestmentAccountCreateDialog
        open={createDialogOpen}
        initialName={createInitialName}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );

  const mobileContent = (
    <>
      <AccountSelectorTrigger
        label={triggerLabel}
        placeholder={triggerPlaceholder}
        onClick={() => {
          setMobileCreateOpen(false);
          setOpen(true);
        }}
      />
      <Drawer open={open} onOpenChange={handleOpenChange}>
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
          <div
            className="flex-1 min-h-0 overflow-clip w-full"
            style={{ overflow: "clip" }}
          >
            <motion.div
              animate={{ x: mobileCreateOpen ? "-100%" : "0%" }}
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
                    placeholder="계좌명, 증권사 검색"
                    value={search}
                    onValueChange={setSearch}
                    wrapperClassName="h-14 px-4"
                    autoFocus={false}
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
                  <AccountCommandList
                    accounts={accounts}
                    value={field.value ?? ""}
                    allowClear={allowClear}
                    createLabel={createLabel}
                    onCreate={handleCreateClick}
                    onValueChange={handleSelect}
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
                      aria-label="계좌 선택으로 돌아가기"
                      onClick={() => setMobileCreateOpen(false)}
                    >
                      <ChevronLeftIcon className="size-5" />
                    </Button>
                    <h2 className="text-base font-semibold">새 투자 계좌</h2>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <InvestmentAccountInlineCreateForm
                      initialName={createInitialName}
                      onCreated={handleCreated}
                      shouldFocus={mobileCreateOpen}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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
