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
import { useAccounts } from "@/hooks/use-accounts";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from "@/hooks/use-payment-methods";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";

const PAYMENT_METHOD_TYPE_VALUES = [
  "credit_card",
  "debit_card",
  "prepaid",
  "gift_card",
  "cash",
] as const;

const PAYMENT_METHOD_TYPE_OPTIONS = [
  { value: "credit_card", label: "신용카드" },
  { value: "debit_card", label: "체크카드" },
  { value: "prepaid", label: "선불페이" },
  { value: "gift_card", label: "상품권" },
  { value: "cash", label: "현금" },
] as const;

type PaymentMethodTypeValue = (typeof PAYMENT_METHOD_TYPE_VALUES)[number];

const paymentMethodFormSchema = z.object({
  name: z
    .string()
    .min(1, "결제수단명은 필수입니다.")
    .max(50, "결제수단명은 50자 이내여야 합니다."),
  type: z.enum(PAYMENT_METHOD_TYPE_VALUES, {
    message: "결제수단 유형을 선택해주세요.",
  }),
  linkedAccountId: z.string().optional(),
  issuer: z
    .string()
    .max(50, "카드사/서비스명은 50자 이내여야 합니다.")
    .optional(),
  lastFour: z
    .string()
    .length(4, "카드 번호 끝 4자리를 입력해주세요.")
    .regex(/^\d{4}$/, "숫자 4자리만 입력해주세요.")
    .optional()
    .or(z.literal("")),
  paymentDay: z
    .number()
    .int()
    .min(1, "결제일은 1일 이상이어야 합니다.")
    .max(31, "결제일은 31일 이하여야 합니다.")
    .optional()
    .or(z.nan()),
  isDefault: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

type PaymentMethodFormData = z.infer<typeof paymentMethodFormSchema>;

interface PaymentMethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethodWithDetails | null;
}

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  paymentMethod,
}: PaymentMethodFormDialogProps) {
  const isEditing = !!paymentMethod;
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();
  const { data: accounts } = useAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      type: "credit_card",
      linkedAccountId: undefined,
      issuer: "",
      lastFour: "",
      paymentDay: undefined,
      isDefault: false,
      memo: "",
    },
  });

  const watchIsDefault = watch("isDefault");
  const watchType = watch("type");

  const showCardFields =
    watchType === "credit_card" || watchType === "debit_card";
  const showPaymentDay = watchType === "credit_card";

  useEffect(() => {
    if (open) {
      if (paymentMethod) {
        reset({
          name: paymentMethod.name,
          type: paymentMethod.type as PaymentMethodTypeValue,
          linkedAccountId: paymentMethod.linkedAccountId ?? undefined,
          issuer: paymentMethod.issuer ?? "",
          lastFour: paymentMethod.lastFour ?? "",
          paymentDay: paymentMethod.paymentDay ?? undefined,
          isDefault: paymentMethod.isDefault,
          memo: paymentMethod.memo ?? "",
        });
      } else {
        reset({
          name: "",
          type: "credit_card",
          linkedAccountId: undefined,
          issuer: "",
          lastFour: "",
          paymentDay: undefined,
          isDefault: false,
          memo: "",
        });
      }
    }
  }, [open, paymentMethod, reset]);

  const onSubmit = async (data: PaymentMethodFormData) => {
    const payload = {
      name: data.name,
      type: data.type,
      linkedAccountId: data.linkedAccountId || undefined,
      issuer: data.issuer || undefined,
      lastFour: data.lastFour || undefined,
      paymentDay: Number.isNaN(data.paymentDay)
        ? undefined
        : (data.paymentDay as number | undefined),
      isDefault: data.isDefault,
      memo: data.memo || undefined,
    };

    try {
      if (isEditing && paymentMethod) {
        await updatePaymentMethod.mutateAsync({
          id: paymentMethod.id,
          data: payload,
        });
        toast.success("결제수단이 수정되었습니다.");
      } else {
        await createPaymentMethod.mutateAsync(payload);
        toast.success(`${data.name}이(가) 추가되었습니다.`);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(
          isEditing
            ? "결제수단 수정에 실패했습니다."
            : "결제수단 추가에 실패했습니다.",
        );
      }
    }
  };

  const handleSave = handleSubmit(onSubmit);
  const isPending =
    createPaymentMethod.isPending || updatePaymentMethod.isPending;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="pm-name">
          결제수단명 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="pm-name"
          placeholder="예: 신한카드 체크"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pm-type">
          유형 <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watchType}
          onValueChange={(value: PaymentMethodTypeValue) =>
            setValue("type", value)
          }
        >
          <SelectTrigger id="pm-type">
            <SelectValue placeholder="결제수단 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHOD_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {showCardFields && (
        <div className="space-y-2">
          <Label htmlFor="pm-issuer">카드사</Label>
          <Input
            id="pm-issuer"
            placeholder="예: 신한카드, 삼성카드"
            {...register("issuer")}
            aria-invalid={!!errors.issuer}
          />
          {errors.issuer && (
            <p className="text-sm text-destructive">{errors.issuer.message}</p>
          )}
        </div>
      )}

      {showCardFields && (
        <div className="space-y-2">
          <Label htmlFor="pm-last-four">카드번호 끝 4자리</Label>
          <Input
            id="pm-last-four"
            placeholder="예: 1234"
            maxLength={4}
            {...register("lastFour")}
            aria-invalid={!!errors.lastFour}
          />
          {errors.lastFour && (
            <p className="text-sm text-destructive">
              {errors.lastFour.message}
            </p>
          )}
        </div>
      )}

      {showPaymentDay && (
        <div className="space-y-2">
          <Label htmlFor="pm-payment-day">결제일</Label>
          <Input
            id="pm-payment-day"
            type="number"
            min={1}
            max={31}
            placeholder="예: 15"
            {...register("paymentDay", { valueAsNumber: true })}
            aria-invalid={!!errors.paymentDay}
          />
          {errors.paymentDay && (
            <p className="text-sm text-destructive">
              {errors.paymentDay.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pm-linked-account">연결 계좌</Label>
        <Select
          value={watch("linkedAccountId") ?? "none"}
          onValueChange={(value) =>
            setValue("linkedAccountId", value === "none" ? undefined : value)
          }
        >
          <SelectTrigger id="pm-linked-account">
            <SelectValue placeholder="연결할 계좌 선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">없음</SelectItem>
            {(accounts ?? []).map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
                {account.broker ? ` (${account.broker})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="pm-is-default"
          checked={watchIsDefault}
          onCheckedChange={(checked) => setValue("isDefault", checked === true)}
        />
        <Label htmlFor="pm-is-default" className="font-normal cursor-pointer">
          기본 결제수단으로 설정
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pm-memo">메모</Label>
        <Textarea
          id="pm-memo"
          placeholder="결제수단에 대한 메모를 입력하세요"
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

  const title = isEditing ? "결제수단 수정" : "결제수단 추가";
  const description = isEditing
    ? "결제수단 정보를 수정합니다."
    : "새로운 결제수단을 등록합니다.";

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4">{formFields}</form>

          <DialogFooter>
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
