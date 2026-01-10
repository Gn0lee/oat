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
import type { AccountWithOwner } from "@/lib/api/account";
import type { AccountType } from "@/types";

type StockAccountType = Extract<
  AccountType,
  "stock" | "isa" | "pension" | "cma"
>;

const STOCK_ACCOUNT_TYPE_VALUES: StockAccountType[] = [
  "stock",
  "isa",
  "pension",
  "cma",
];

const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z.string().max(50, "증권사/은행명은 50자 이내여야 합니다."),
  accountNumber: z.string().max(50, "계좌번호는 50자 이내여야 합니다."),
  accountType: z.enum(["stock", "isa", "pension", "cma"], {
    message: "계좌 유형을 선택해주세요.",
  }),
  isDefault: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다."),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

const ACCOUNT_TYPES = [
  { value: "stock", label: "일반" },
  { value: "isa", label: "ISA" },
  { value: "pension", label: "연금저축" },
  { value: "cma", label: "CMA" },
] as const;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountWithOwner | null;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: AccountFormDialogProps) {
  const isEditing = !!account;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      broker: "",
      accountNumber: "",
      accountType: "stock",
      isDefault: false,
      memo: "",
    },
  });

  const watchIsDefault = watch("isDefault");

  useEffect(() => {
    if (open) {
      if (account) {
        const isStockAccountType = (
          type: AccountType | null,
        ): type is StockAccountType =>
          type !== null &&
          STOCK_ACCOUNT_TYPE_VALUES.includes(type as StockAccountType);

        const accountType = isStockAccountType(account.accountType)
          ? account.accountType
          : "stock";

        reset({
          name: account.name,
          broker: account.broker || "",
          accountNumber: account.accountNumber || "",
          accountType,
          isDefault: account.isDefault,
          memo: account.memo || "",
        });
      } else {
        reset({
          name: "",
          broker: "",
          accountNumber: "",
          accountType: "stock",
          isDefault: false,
          memo: "",
        });
      }
    }
  }, [open, account, reset]);

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
            isDefault: data.isDefault,
            memo: data.memo || null,
          },
        });
        toast.success("계좌가 수정되었습니다.");
        onOpenChange(false);
      } else {
        await createAccount.mutateAsync(data);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "계좌 수정" : "계좌 추가"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "계좌 정보를 수정합니다."
              : "새로운 계좌를 등록합니다."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              계좌명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="예: 삼성증권 주식계좌"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">증권사/은행</Label>
            <Input
              id="broker"
              placeholder="예: 삼성증권, 토스증권"
              {...register("broker")}
              aria-invalid={!!errors.broker}
            />
            {errors.broker && (
              <p className="text-sm text-destructive">
                {errors.broker.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">
              계좌 유형 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("accountType")}
              onValueChange={(value: StockAccountType) =>
                setValue("accountType", value)
              }
            >
              <SelectTrigger id="accountType">
                <SelectValue placeholder="계좌 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
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
              onCheckedChange={(checked) =>
                setValue("isDefault", checked === true)
              }
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
        </form>

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
