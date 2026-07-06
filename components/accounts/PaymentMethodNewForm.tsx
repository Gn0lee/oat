"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CreditCard, Gift, Landmark, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreatePaymentMethod } from "@/hooks/use-payment-methods";

const PAYMENT_METHOD_TYPE_VALUES = [
  "credit_card",
  "debit_card",
  "prepaid",
  "gift_card",
  "cash",
] as const;

type PaymentMethodTypeValue = (typeof PAYMENT_METHOD_TYPE_VALUES)[number];

const AUXILIARY_PAYMENT_METHOD_TYPES = new Set<PaymentMethodTypeValue>([
  "prepaid",
  "gift_card",
  "cash",
]);

const AUXILIARY_BALANCE_COPY =
  "이 잔액은 가계부 기록을 정확하게 맞추기 위한 보조잔액이며, 총자산에는 포함되지 않습니다.";

function isAuxiliaryPaymentMethodType(type: PaymentMethodTypeValue) {
  return AUXILIARY_PAYMENT_METHOD_TYPES.has(type);
}

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
  balanceStr: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), {
      message: "숫자로 입력해주세요.",
    }),
  isHouseholdUsable: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

type PaymentMethodFormData = z.infer<typeof paymentMethodFormSchema>;

interface CategoryCardProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function CategoryCard({
  onClick,
  icon,
  title,
  description,
}: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
    >
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

interface DetailFormProps {
  type: PaymentMethodTypeValue;
  onBack: () => void;
}

function DetailForm({ type, onBack }: DetailFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/ledger/payment-methods";

  const createPaymentMethod = useCreatePaymentMethod();
  const { data: accounts } = useAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      type,
      linkedAccountId: undefined,
      issuer: "",
      lastFour: "",
      paymentDay: undefined,
      balanceStr: "",
      isHouseholdUsable: false,
      memo: "",
    },
  });

  const watchType = watch("type");

  const showCardFields =
    watchType === "credit_card" || watchType === "debit_card";
  const showPaymentDay = watchType === "credit_card";
  const showAuxiliaryBalance = isAuxiliaryPaymentMethodType(watchType);

  const onSubmit = async (data: PaymentMethodFormData) => {
    const balance =
      showAuxiliaryBalance && data.balanceStr !== ""
        ? Number(data.balanceStr)
        : undefined;
    const payload = {
      name: data.name,
      type: data.type,
      linkedAccountId: data.linkedAccountId || undefined,
      issuer: data.issuer || undefined,
      lastFour: data.lastFour || undefined,
      paymentDay: Number.isNaN(data.paymentDay)
        ? undefined
        : (data.paymentDay as number | undefined),
      memo: data.memo || undefined,
      isHouseholdUsable: data.isHouseholdUsable,
      ...(showAuxiliaryBalance && { balance }),
    };

    try {
      await createPaymentMethod.mutateAsync(payload);
      toast.success(`${data.name}이(가) 추가되었습니다.`);
      router.push(returnUrl);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("결제수단 추가에 실패했습니다.");
      }
    }
  };

  const isPending = createPaymentMethod.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      {/* 유형은 Funnel에서 선택했으므로 숨김 (필요시 Select 유지) */}
      <input type="hidden" {...register("type")} />

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
            inputMode="numeric"
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
            inputMode="numeric"
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

      {showAuxiliaryBalance && (
        <div className="space-y-2">
          <Label htmlFor="pm-balance">보조잔액</Label>
          <div className="relative">
            <Input
              id="pm-balance"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="예: 30000"
              className="pr-10"
              {...register("balanceStr")}
              aria-invalid={!!errors.balanceStr}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
              원
            </span>
          </div>
          {errors.balanceStr && (
            <p className="text-sm text-destructive">
              {errors.balanceStr.message}
            </p>
          )}
          <p className="text-sm text-gray-500">{AUXILIARY_BALANCE_COPY}</p>
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

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="pm-household-usable"
            checked={watch("isHouseholdUsable")}
            onCheckedChange={(checked) =>
              setValue("isHouseholdUsable", checked === true)
            }
          />
          <div>
            <Label htmlFor="pm-household-usable">가구원 사용 허용</Label>
            <p className="text-sm text-muted-foreground">
              공용 가계부 기록에서 모든 가구원이 사용할 수 있어요.
            </p>
          </div>
        </div>
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

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isPending || isSubmitting}
          className="flex-1"
        >
          이전
        </Button>
        <Button
          type="submit"
          disabled={isPending || isSubmitting}
          className="flex-1"
        >
          {isPending || isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodNewFormInner() {
  const [type, setType] = useState<PaymentMethodTypeValue | null>(null);

  if (type) {
    return <DetailForm type={type} onBack={() => setType(null)} />;
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-500">어떤 결제수단을 추가하시겠어요?</p>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
        <CategoryCard
          onClick={() => setType("credit_card")}
          icon={<CreditCard className="w-6 h-6 text-primary" />}
          title="신용카드"
          description="결제일에 연결 계좌에서 출금"
        />
        <CategoryCard
          onClick={() => setType("debit_card")}
          icon={<Landmark className="w-6 h-6 text-primary" />}
          title="체크카드"
          description="연결 계좌에서 즉시 출금"
        />
        <CategoryCard
          onClick={() => setType("prepaid")}
          icon={<Wallet className="w-6 h-6 text-primary" />}
          title="선불페이"
          description="네이버페이, 카카오페이 등 충전식 페이"
        />
        <CategoryCard
          onClick={() => setType("gift_card")}
          icon={<Gift className="w-6 h-6 text-primary" />}
          title="상품권"
          description="백화점, 마트, 문화상품권 등"
        />
        <CategoryCard
          onClick={() => setType("cash")}
          icon={<Banknote className="w-6 h-6 text-primary" />}
          title="현금"
          description="실물 현금 결제"
        />
      </div>
    </div>
  );
}

export function PaymentMethodNewForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentMethodNewFormInner />
    </Suspense>
  );
}
