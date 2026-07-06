"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, TrendingUp } from "lucide-react";
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
import { useCreateAccount } from "@/hooks/use-accounts";

type AccountCategory = "bank" | "investment";

const BANK_ACCOUNT_TYPES = ["checking", "savings", "deposit"] as const;
const INVESTMENT_ACCOUNT_TYPES = ["stock", "isa", "pension", "cma"] as const;
const ALL_ACCOUNT_TYPES = [
  ...BANK_ACCOUNT_TYPES,
  ...INVESTMENT_ACCOUNT_TYPES,
] as const;

type AllAccountType = (typeof ALL_ACCOUNT_TYPES)[number];

const detailFormSchema = z.object({
  name: z
    .string()
    .min(1, "계좌명은 필수입니다.")
    .max(50, "계좌명은 50자 이내여야 합니다."),
  broker: z.string().max(50, "증권사/은행명은 50자 이내여야 합니다."),
  lastFour: z.string().regex(/^\d{0,4}$/, "숫자 4자리만 입력해주세요."),
  accountType: z.enum(ALL_ACCOUNT_TYPES, {
    message: "계좌 유형을 선택해주세요.",
  }),
  balanceStr: z.string(),
  isHouseholdUsable: z.boolean(),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다."),
});

type DetailFormData = z.infer<typeof detailFormSchema>;

const BANK_TYPE_OPTIONS = [
  { value: "checking", label: "입출금" },
  { value: "savings", label: "적금" },
  { value: "deposit", label: "예금" },
] as const;

const INVESTMENT_TYPE_OPTIONS = [
  { value: "stock", label: "일반" },
  { value: "isa", label: "ISA" },
  { value: "pension", label: "연금저축" },
  { value: "cma", label: "CMA" },
] as const;

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
  category: AccountCategory;
  onBack: () => void;
}

function DetailForm({ category, onBack }: DetailFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/assets/accounts";
  const createAccount = useCreateAccount();
  const isBank = category === "bank";
  const defaultAccountType: AllAccountType = isBank ? "checking" : "stock";
  const typeOptions = isBank ? BANK_TYPE_OPTIONS : INVESTMENT_TYPE_OPTIONS;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DetailFormData>({
    resolver: zodResolver(detailFormSchema),
    defaultValues: {
      name: "",
      broker: "",
      lastFour: "",
      accountType: defaultAccountType,
      balanceStr: "",
      isHouseholdUsable: false,
      memo: "",
    },
  });

  const onSubmit = async (data: DetailFormData) => {
    const balance =
      data.balanceStr !== "" ? Number(data.balanceStr) : undefined;

    if (balance !== undefined && (Number.isNaN(balance) || balance < 0)) {
      return;
    }

    try {
      await createAccount.mutateAsync({
        name: data.name,
        broker: data.broker || undefined,
        lastFour: data.lastFour || undefined,
        accountType: data.accountType,
        category,
        balance,
        isHouseholdUsable: data.isHouseholdUsable,
        memo: data.memo || undefined,
      });
      toast.success(`${data.name} 계좌가 추가되었습니다.`);
      router.push(returnUrl);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("계좌 추가에 실패했습니다.");
      }
    }
  };

  const isPending = createAccount.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            setValue("accountType", value as AllAccountType)
          }
        >
          <SelectTrigger id="accountType">
            <SelectValue placeholder="계좌 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((type) => (
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
        <Label htmlFor="lastFour">계좌번호 뒤 4자리</Label>
        <Input
          id="lastFour"
          inputMode="numeric"
          maxLength={4}
          placeholder="예: 1234"
          {...register("lastFour")}
          aria-invalid={!!errors.lastFour}
        />
        {errors.lastFour && (
          <p className="text-sm text-destructive">{errors.lastFour.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="balanceStr">잔액</Label>
        <div className="relative">
          <Input
            id="balanceStr"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="예: 1000000"
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
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="isHouseholdUsable"
            checked={watch("isHouseholdUsable")}
            onCheckedChange={(checked) =>
              setValue("isHouseholdUsable", checked === true)
            }
          />
          <div>
            <Label htmlFor="isHouseholdUsable">가구원 사용 허용</Label>
            <p className="text-sm text-muted-foreground">
              공용 가계부 기록에서 모든 가구원이 사용할 수 있어요.
            </p>
          </div>
        </div>
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

export function AccountNewFormInner() {
  const [category, setCategory] = useState<AccountCategory | null>(null);

  if (category) {
    return <DetailForm category={category} onBack={() => setCategory(null)} />;
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-500">어떤 계좌를 추가하시겠어요?</p>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
        <CategoryCard
          onClick={() => setCategory("bank")}
          icon={<Building2 className="w-6 h-6 text-primary" />}
          title="은행 계좌"
          description="입출금, 예금, 적금 계좌"
        />
        <CategoryCard
          onClick={() => setCategory("investment")}
          icon={<TrendingUp className="w-6 h-6 text-primary" />}
          title="투자 계좌"
          description="주식, ISA, 연금저축, CMA 계좌"
        />
      </div>
    </div>
  );
}

export function AccountNewForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountNewFormInner />
    </Suspense>
  );
}
