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
  accountNumber: z.string().max(50, "계좌번호는 50자 이내여야 합니다."),
  accountType: z.enum(ALL_ACCOUNT_TYPES, {
    message: "계좌 유형을 선택해주세요.",
  }),
  balanceStr: z.string(),
  isDefault: z.boolean(),
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
      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900">{title}</p>
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
      accountNumber: "",
      accountType: defaultAccountType,
      balanceStr: "",
      isDefault: false,
      memo: "",
    },
  });

  const watchIsDefault = watch("isDefault");

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
        accountNumber: data.accountNumber || undefined,
        accountType: data.accountType,
        category,
        balance,
        isDefault: data.isDefault,
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

      <div className="space-y-2">
        <Label htmlFor="balanceStr">잔액</Label>
        <Input
          id="balanceStr"
          type="number"
          min="0"
          placeholder="예: 1000000"
          {...register("balanceStr")}
          aria-invalid={!!errors.balanceStr}
        />
        {errors.balanceStr && (
          <p className="text-sm text-destructive">
            {errors.balanceStr.message}
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
      <div className="space-y-3">
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
