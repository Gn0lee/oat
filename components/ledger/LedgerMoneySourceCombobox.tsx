"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BanknoteIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  GiftIcon,
  LandmarkIcon,
  PlusIcon,
  WalletIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, FormEvent } from "react";
import { forwardRef, useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useCreatePaymentMethod } from "@/hooks/use-payment-methods";
import {
  buildLedgerMoneySourceGroups,
  type LedgerMoneySourceAccount,
  type LedgerMoneySourceGroup,
  type LedgerMoneySourceMode,
  type LedgerMoneySourcePaymentMethod,
} from "@/lib/ledger/money-source-options";
import { cn } from "@/lib/utils/cn";
import type { Account, PaymentMethod, PaymentMethodType } from "@/types";

interface LedgerMoneySourceBaseProps {
  mode: LedgerMoneySourceMode;
  value: string;
  paymentMethods: LedgerMoneySourcePaymentMethod[];
  accounts: LedgerMoneySourceAccount[];
  ownerId?: string | null;
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
  ownerId,
  includeClearOption = true,
  excludedValues = [],
}: LedgerMoneySourceBaseProps): LedgerMoneySourceGroup[] {
  return useMemo(() => {
    const excluded = new Set(excludedValues);
    const scopedPaymentMethods = ownerId
      ? paymentMethods.filter((item) => item.ownerId === ownerId)
      : paymentMethods;
    const scopedAccounts = ownerId
      ? accounts.filter((item) => item.ownerId === ownerId)
      : accounts;
    return buildLedgerMoneySourceGroups({
      mode,
      paymentMethods: scopedPaymentMethods,
      accounts: scopedAccounts,
      includeClearOption,
    })
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => !excluded.has(option.value)),
      }))
      .filter((group) => group.options.length > 0);
  }, [
    mode,
    paymentMethods,
    accounts,
    ownerId,
    includeClearOption,
    excludedValues,
  ]);
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
  createLabel,
  onCreate,
  className,
}: {
  groups: LedgerMoneySourceGroup[];
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

const PAYMENT_METHOD_TYPE_OPTIONS: Array<{
  value: PaymentMethodType;
  label: string;
  icon: typeof CreditCardIcon;
}> = [
  { value: "credit_card", label: "신용카드", icon: CreditCardIcon },
  { value: "debit_card", label: "체크카드", icon: LandmarkIcon },
  { value: "prepaid", label: "선불페이", icon: WalletIcon },
  { value: "gift_card", label: "상품권", icon: GiftIcon },
  { value: "cash", label: "현금", icon: BanknoteIcon },
];

type MoneySourceCreateTarget =
  | { kind: "choose" }
  | { kind: "account" }
  | { kind: "paymentMethod"; type: PaymentMethodType; label: string };

function AccountInlineCreateForm({
  initialName,
  category,
  onBack,
  onCreated,
}: {
  initialName: string;
  category: "bank" | "investment";
  onBack?: () => void;
  onCreated: (account: Account) => void;
}) {
  const createAccount = useCreateAccount();
  const [name, setName] = useState(initialName);
  const [broker, setBroker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isBank = category === "bank";

  useEffect(() => {
    setName(initialName);
    setBroker("");
    setError(null);
  }, [initialName]);

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
        category,
        accountType: isBank ? "checking" : "stock",
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
        <Label htmlFor="inline-account-name">계좌명</Label>
        <Input
          id="inline-account-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inline-account-broker">
          {isBank ? "은행" : "증권사"}
        </Label>
        <Input
          id="inline-account-broker"
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

function PaymentMethodInlineCreateForm({
  initialName,
  type,
  typeLabel,
  accounts,
  onBack,
  onCreated,
}: {
  initialName: string;
  type: PaymentMethodType;
  typeLabel: string;
  accounts: LedgerMoneySourceAccount[];
  onBack?: () => void;
  onCreated: (paymentMethod: PaymentMethod) => void;
}) {
  const createPaymentMethod = useCreatePaymentMethod();
  const [name, setName] = useState(initialName);
  const [linkedAccountId, setLinkedAccountId] = useState("none");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setLinkedAccountId("none");
    setError(null);
  }, [initialName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("결제수단명을 입력해주세요.");
      return;
    }

    try {
      const paymentMethod = await createPaymentMethod.mutateAsync({
        name: trimmedName,
        type,
        linkedAccountId:
          linkedAccountId === "none" ? undefined : linkedAccountId,
      });
      onCreated(paymentMethod);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "결제수단 추가에 실패했습니다.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inline-payment-method-name">결제수단명</Label>
        <Input
          id="inline-payment-method-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>유형</Label>
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {typeLabel}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inline-payment-linked-account">연결 계좌</Label>
        <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
          <SelectTrigger id="inline-payment-linked-account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            <SelectItem value="none">연결 안 함</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
                {account.broker ? ` (${account.broker})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            이전
          </Button>
        )}
        <Button type="submit" disabled={createPaymentMethod.isPending}>
          {createPaymentMethod.isPending ? "추가 중..." : "추가"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function MoneySourceCreateDialog({
  open,
  mode,
  initialName,
  accounts,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  mode: LedgerMoneySourceMode;
  initialName: string;
  accounts: LedgerMoneySourceAccount[];
  onOpenChange: (open: boolean) => void;
  onCreated: (value: string) => void;
}) {
  const [target, setTarget] = useState<MoneySourceCreateTarget>({
    kind: "choose",
  });
  const accountCategory = mode === "income" ? "bank" : "bank";

  useEffect(() => {
    if (open) {
      setTarget(mode === "expense" ? { kind: "choose" } : { kind: "account" });
    }
  }, [open, mode]);

  const handleClose = () => onOpenChange(false);

  const title =
    target.kind === "choose"
      ? "무엇을 추가할까요?"
      : target.kind === "account"
        ? mode === "income"
          ? "새 입금 계좌"
          : "새 계좌"
        : `새 ${target.label}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            기록 입력 중 사용할 참조 데이터를 추가합니다.
          </DialogDescription>
        </DialogHeader>
        {target.kind === "choose" && (
          <div className="grid gap-2">
            {PAYMENT_METHOD_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  className="h-12 justify-start"
                  onClick={() =>
                    setTarget({
                      kind: "paymentMethod",
                      type: option.value,
                      label: option.label,
                    })
                  }
                >
                  <Icon className="size-4" />
                  {option.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="h-12 justify-start"
              onClick={() => setTarget({ kind: "account" })}
            >
              <LandmarkIcon className="size-4" />
              계좌
            </Button>
          </div>
        )}
        {target.kind === "account" && (
          <AccountInlineCreateForm
            initialName={initialName}
            category={accountCategory}
            onBack={
              mode === "expense"
                ? () => setTarget({ kind: "choose" })
                : undefined
            }
            onCreated={(account) => {
              onCreated(`acc:${account.id}`);
              handleClose();
            }}
          />
        )}
        {target.kind === "paymentMethod" && (
          <PaymentMethodInlineCreateForm
            initialName={initialName}
            type={target.type}
            typeLabel={target.label}
            accounts={accounts}
            onBack={() => setTarget({ kind: "choose" })}
            onCreated={(paymentMethod) => {
              onCreated(`pm:${paymentMethod.id}`);
              handleClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LedgerMoneySourceCombobox({
  mode,
  value,
  paymentMethods,
  accounts,
  ownerId,
  includeClearOption = true,
  excludedValues,
  placeholder,
  onValueChange,
}: LedgerMoneySourceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const scopedAccounts = ownerId
    ? accounts.filter((account) => account.ownerId === ownerId)
    : accounts;
  const groups = useMoneySourceGroups({
    mode,
    value,
    paymentMethods,
    accounts,
    ownerId,
    includeClearOption,
    excludedValues,
  });
  const selectedLabel = findSelectedLabel(groups, value) ?? placeholder;
  const createQuery = search.trim();
  const createLabel = createQuery
    ? mode === "income"
      ? `"${createQuery}" 새 입금 계좌 추가`
      : `"${createQuery}" 새 결제 방법 추가`
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
            <CommandInput
              placeholder="이름, 기관, 소유자 검색"
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
            <MoneySourceCommandList
              groups={groups}
              value={value}
              createLabel={createLabel}
              onCreate={handleCreateClick}
              onValueChange={handleValueChange}
            />
          </Command>
        </PopoverContent>
      </Popover>
      <MoneySourceCreateDialog
        open={createDialogOpen}
        mode={mode}
        initialName={createInitialName}
        accounts={scopedAccounts}
        onOpenChange={setCreateDialogOpen}
        onCreated={onValueChange}
      />
    </>
  );
}

export function LedgerMoneySourcePickerPanel({
  mode,
  value,
  paymentMethods,
  accounts,
  ownerId,
  includeClearOption = true,
  excludedValues,
  searchPlaceholder,
  onValueChange,
}: LedgerMoneySourcePickerPanelProps) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<MoneySourceCreateTarget | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [createInitialName, setCreateInitialName] = useState("");
  const scopedAccounts = ownerId
    ? accounts.filter((account) => account.ownerId === ownerId)
    : accounts;
  const groups = useMoneySourceGroups({
    mode,
    value,
    paymentMethods,
    accounts,
    ownerId,
    includeClearOption,
    excludedValues,
  });
  const createQuery = search.trim();
  const createLabel = createQuery
    ? mode === "income"
      ? `"${createQuery}" 새 입금 계좌 추가`
      : `"${createQuery}" 새 결제 방법 추가`
    : undefined;

  const handleCreateClick = () => {
    if (!createQuery) return;
    setCreateInitialName(createQuery);
    setTarget(mode === "expense" ? { kind: "choose" } : { kind: "account" });
  };

  const isExpense = mode === "expense";

  const getTranslateX = () => {
    if (!target) return "0%";
    if (target.kind === "choose") return isExpense ? "-100%" : "0%";
    return isExpense ? "-200%" : "-100%";
  };

  const formTitle =
    target?.kind === "account"
      ? mode === "income"
        ? "새 입금 계좌"
        : "새 계좌"
      : target?.kind === "paymentMethod"
        ? `새 ${target.label}`
        : "";

  return (
    <div
      className="flex-1 min-h-0 overflow-clip w-full h-full"
      style={{ overflow: "clip" }}
    >
      <motion.div
        animate={{ x: getTranslateX() }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }
        }
        className="flex h-full w-full"
      >
        {/* Select View */}
        <div className="h-full w-full shrink-0 min-w-0">
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
            <MoneySourceCommandList
              groups={groups}
              value={value}
              createLabel={createLabel}
              onCreate={handleCreateClick}
              onValueChange={onValueChange}
              className="max-h-none min-h-0 flex-1"
            />
          </Command>
        </div>

        {/* Choose View (Expense Only) */}
        {isExpense && (
          <div className="h-full w-full shrink-0 min-w-0">
            <div className="flex h-full flex-col">
              <div className="flex h-14 shrink-0 items-center border-b px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="결제 방법 선택으로 돌아가기"
                  onClick={() => setTarget(null)}
                >
                  <ChevronLeftIcon className="size-5" />
                </Button>
                <h2 className="text-base font-semibold">무엇을 추가할까요?</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid gap-2">
                  {PAYMENT_METHOD_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        className="h-12 justify-start gap-2"
                        onClick={() =>
                          setTarget({
                            kind: "paymentMethod",
                            type: option.value,
                            label: option.label,
                          })
                        }
                      >
                        <Icon className="size-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 justify-start gap-2"
                    onClick={() => setTarget({ kind: "account" })}
                  >
                    <LandmarkIcon className="size-4" />
                    계좌
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form View */}
        <div className="h-full w-full shrink-0 min-w-0">
          <div className="flex h-full flex-col">
            <div className="flex h-14 shrink-0 items-center border-b px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="결제 방법 선택으로 돌아가기"
                onClick={() => {
                  if (mode === "expense") {
                    setTarget({ kind: "choose" });
                  } else {
                    setTarget(null);
                  }
                }}
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
              <h2 className="text-base font-semibold">{formTitle}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {target?.kind === "account" && (
                <AccountInlineCreateForm
                  initialName={createInitialName}
                  category="bank"
                  onCreated={(account) => onValueChange(`acc:${account.id}`)}
                />
              )}
              {target?.kind === "paymentMethod" && (
                <PaymentMethodInlineCreateForm
                  initialName={createInitialName}
                  type={target.type}
                  typeLabel={target.label}
                  accounts={scopedAccounts}
                  onCreated={(paymentMethod) =>
                    onValueChange(`pm:${paymentMethod.id}`)
                  }
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
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
