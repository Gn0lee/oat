"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAccount, useUpdateAccount } from "@/hooks/use-accounts";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { AccountWithOwner } from "@/lib/api/account";

const BANK_ACCOUNT_TYPES = ["checking", "savings", "deposit"] as const;
const INVESTMENT_ACCOUNT_TYPES = ["stock", "isa", "pension", "cma"] as const;

type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];
type InvestmentAccountType = (typeof INVESTMENT_ACCOUNT_TYPES)[number];

const bankAccountFormSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z.string().max(50, "증권사/은행명은 50자 이내여야 합니다."),
  accountNumber: z.string().max(50, "계좌번호는 50자 이내여야 합니다."),
  accountType: z.enum(BANK_ACCOUNT_TYPES, {
    message: "계좌 유형을 선택해주세요.",
  }),
  isDefault: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다."),
});

const investmentAccountFormSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z.string().max(50, "증권사/은행명은 50자 이내여야 합니다."),
  accountNumber: z.string().max(50, "계좌번호는 50자 이내여야 합니다."),
  accountType: z.enum(INVESTMENT_ACCOUNT_TYPES, {
    message: "계좌 유형을 선택해주세요.",
  }),
  isDefault: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다."),
});

type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;
type InvestmentAccountFormData = z.infer<typeof investmentAccountFormSchema>;
type AccountFormData = BankAccountFormData | InvestmentAccountFormData;

const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: "checking", label: "입출금" },
  { value: "savings", label: "적금" },
  { value: "deposit", label: "예금" },
] as const;

const INVESTMENT_ACCOUNT_TYPE_OPTIONS = [
  { value: "stock", label: "일반" },
  { value: "isa", label: "ISA" },
  { value: "pension", label: "연금저축" },
  { value: "cma", label: "CMA" },
] as const;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountWithOwner | null;
  category?: "bank" | "investment";
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  category = "investment",
}: AccountFormDialogProps) {
  const isEditing = !!account;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const effectiveCategory =
    account?.category ??
    (BANK_ACCOUNT_TYPES.includes(account?.accountType as BankAccountType)
      ? "bank"
      : category);

  const isBank = effectiveCategory === "bank";
  const schema = isBank ? bankAccountFormSchema : investmentAccountFormSchema;
  const defaultAccountType = isBank ? "checking" : "stock";
  const accountTypeOptions = isBank
    ? BANK_ACCOUNT_TYPE_OPTIONS
    : INVESTMENT_ACCOUNT_TYPE_OPTIONS;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      broker: "",
      accountNumber: "",
      accountType: defaultAccountType as BankAccountType &
        InvestmentAccountType,
      isDefault: false,
      memo: "",
    },
  });

  const watchIsDefault = watch("isDefault");

  useEffect(() => {
    if (open) {
      if (account) {
        const validTypes = isBank
          ? (BANK_ACCOUNT_TYPES as readonly string[])
          : (INVESTMENT_ACCOUNT_TYPES as readonly string[]);
        const resolvedType = validTypes.includes(account.accountType ?? "")
          ? account.accountType
          : defaultAccountType;

        reset({
          name: account.name,
          broker: account.broker || "",
          accountNumber: account.accountNumber || "",
          accountType: resolvedType as BankAccountType & InvestmentAccountType,
          isDefault: account.isDefault,
          memo: account.memo || "",
        });
      } else {
        reset({
          name: "",
          broker: "",
          accountNumber: "",
          accountType: defaultAccountType as BankAccountType &
            InvestmentAccountType,
          isDefault: false,
          memo: "",
        });
      }
    }
  }, [open, account, reset, isBank, defaultAccountType]);

  const onSubmit = async (data: AccountFormData, continueAdding = false) => {
    try {
      if (isEditing && account) {
        await updateAccount.mutateAsync({
          id: account.id,
          data: {
            name: data.name,
            broker: data.broker || null,
            accountNumber: data.accountNumber || null,
            accountType: data.accountType,
            category: isBank ? "bank" : "investment",
            isDefault: data.isDefault,
            memo: data.memo || null,
          },
        });
        toast.success("계좌가 수정되었습니다.");
        onOpenChange(false);
      } else {
        await createAccount.mutateAsync({
          ...data,
          category: isBank ? "bank" : "investment",
        });
        toast.success(`${data.name} 계좌가 추가되었습니다.`);

        if (continueAdding) {
          reset({
            name: "",
            broker: data.broker,
            accountNumber: "",
            accountType: data.accountType,
            isDefault: false,
            memo: "",
          });
        } else {
          onOpenChange(false);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(
          isEditing ? "계좌 수정에 실패했습니다." : "계좌 추가에 실패했습니다.",
        );
      }
    }
  };

  const handleSave = handleSubmit((data) => onSubmit(data, false));
  const handleSaveAndContinue = handleSubmit((data) => onSubmit(data, true));

  const isPending = createAccount.isPending || updateAccount.isPending;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          계좌명 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder={
            isBank ? "예: 국민은행 입출금통장" : "예: 삼성증권 주식계좌"
          }
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="broker">{isBank ? "은행" : "증권사/은행"}</Label>
        <Input
          id="broker"
          placeholder={
            isBank ? "예: 국민은행, 신한은행" : "예: 삼성증권, 토스증권"
          }
          {...register("broker")}
          aria-invalid={!!errors.broker}
        />
        {errors.broker && (
          <p className="text-sm text-destructive">{errors.broker.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountType">
          계좌 유형 <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watch("accountType")}
          onValueChange={(value) =>
            setValue(
              "accountType",
              value as BankAccountType & InvestmentAccountType,
            )
          }
        >
          <SelectTrigger id="accountType">
            <SelectValue placeholder="계좌 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {accountTypeOptions.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.accountType && (
          <p className="text-sm text-destructive">
            {errors.accountType.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountNumber">계좌번호</Label>
        <Input
          id="accountNumber"
          placeholder="예: 123-456-78901234"
          {...register("accountNumber")}
          aria-invalid={!!errors.accountNumber}
        />
        {errors.accountNumber && (
          <p className="text-sm text-destructive">
            {errors.accountNumber.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={watchIsDefault}
          onCheckedChange={(checked) => setValue("isDefault", checked === true)}
        />
        <Label htmlFor="isDefault" className="font-normal cursor-pointer">
          기본 계좌로 설정
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">메모</Label>
        <Textarea
          id="memo"
          placeholder="계좌에 대한 메모를 입력하세요"
          rows={2}
          {...register("memo")}
          aria-invalid={!!errors.memo}
        />
        {errors.memo && (
          <p className="text-sm text-destructive">{errors.memo.message}</p>
        )}
      </div>
    </>
  );

  const title = isEditing
    ? "계좌 수정"
    : isBank
      ? "은행 계좌 추가"
      : "투자 계좌 추가";
  const description = isEditing
    ? "계좌 정보를 수정합니다."
    : isBank
      ? "새로운 은행 계좌를 등록합니다."
      : "새로운 투자 계좌를 등록합니다.";

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4">{formFields}</form>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndContinue}
                disabled={isPending || isSubmitting}
                className="sm:order-1"
              >
                저장하고 추가 계속
              </Button>
            )}
            <div className="flex gap-2 sm:order-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending || isSubmitting}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending || isSubmitting}
              >
                {isPending || isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form className="space-y-4 pb-2">{formFields}</form>
        </div>

        <DrawerFooter>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAndContinue}
              disabled={isPending || isSubmitting}
            >
              저장하고 추가 계속
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || isSubmitting}
              className="flex-1"
            >
              {isPending || isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
