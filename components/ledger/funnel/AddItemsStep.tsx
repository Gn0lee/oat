"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { LedgerItemFormData } from "@/lib/api/ledger";
import type { CategoryType } from "@/types";

const itemSchema = z.object({
  amount: z.string().min(1, "금액을 입력해주세요"),
  title: z.string().min(1, "내용을 입력해주세요"),
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  paymentMethodId: z.string().optional(),
  accountId: z.string().optional(),
  transactedAt: z.string().min(1, "날짜를 선택해주세요"),
  memo: z.string().max(500).optional(),
});

const formSchema = z.object({
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface AddItemsStepProps {
  type: "expense" | "income";
  onNext: (items: LedgerItemFormData[]) => void;
  onBack: () => void;
}

const today = format(new Date(), "yyyy-MM-dd");

export function AddItemsStep({ type, onNext, onBack }: AddItemsStepProps) {
  const categoryType = type as CategoryType;
  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategories(categoryType);
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [
        {
          amount: "",
          title: "",
          categoryId: "",
          paymentMethodId: undefined,
          accountId: undefined,
          transactedAt: today,
          memo: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = form.handleSubmit((values) => {
    onNext(values.items as LedgerItemFormData[]);
  });

  const handleAddRow = () => {
    append({
      amount: "",
      title: "",
      categoryId: "",
      paymentMethodId: undefined,
      accountId: undefined,
      transactedAt: today,
      memo: "",
    });
  };

  const typeLabel = type === "expense" ? "지출" : "수입";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {typeLabel} 내역 입력
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field, index) => {
          const errors = form.formState.errors.items?.[index];

          const paymentValue = form.watch(`items.${index}.paymentMethodId`)
            ? `pm:${form.watch(`items.${index}.paymentMethodId`)}`
            : form.watch(`items.${index}.accountId`)
              ? `acc:${form.watch(`items.${index}.accountId`)}`
              : "";

          const handlePaymentChange = (v: string) => {
            if (v.startsWith("pm:")) {
              form.setValue(`items.${index}.paymentMethodId`, v.slice(3));
              form.setValue(`items.${index}.accountId`, undefined);
            } else if (v.startsWith("acc:")) {
              form.setValue(`items.${index}.accountId`, v.slice(4));
              form.setValue(`items.${index}.paymentMethodId`, undefined);
            } else {
              form.setValue(`items.${index}.paymentMethodId`, undefined);
              form.setValue(`items.${index}.accountId`, undefined);
            }
          };

          return (
            <div
              key={field.id}
              className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  내역 {index + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2Icon className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>

              {/* 금액 */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-700">금액 *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₩
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    className="pl-7"
                    {...form.register(`items.${index}.amount`)}
                  />
                </div>
                {errors?.amount && (
                  <p className="text-xs text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* 내용 */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-700">내용 *</Label>
                <Input
                  placeholder="예: 이마트 장보기, 스타벅스 아메리카노"
                  {...form.register(`items.${index}.title`)}
                />
                {errors?.title && (
                  <p className="text-xs text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* 카테고리 + 결제수단/계좌 — 2컬럼 그리드 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-700">카테고리 *</Label>
                  {isLoadingCategories ? (
                    <div className="h-9 bg-gray-100 rounded-md animate-pulse" />
                  ) : (
                    <Select
                      value={form.watch(`items.${index}.categoryId`)}
                      onValueChange={(v) =>
                        form.setValue(`items.${index}.categoryId`, v, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors?.categoryId && (
                    <p className="text-xs text-red-500">
                      {errors.categoryId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-700">
                    {type === "expense" ? "결제 방법" : "입금 계좌"}
                  </Label>
                  {type === "expense" ? (
                    <Select
                      value={paymentValue}
                      onValueChange={handlePaymentChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="선택 안함" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>결제수단</SelectLabel>
                            {paymentMethods.map((pm) => (
                              <SelectItem key={pm.id} value={`pm:${pm.id}`}>
                                {pm.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {paymentMethods.length > 0 && accounts.length > 0 && (
                          <SelectSeparator />
                        )}
                        {accounts.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>계좌</SelectLabel>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={`acc:${acc.id}`}>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={form.watch(`items.${index}.accountId`) ?? ""}
                      onValueChange={(v) =>
                        form.setValue(
                          `items.${index}.accountId`,
                          v || undefined,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="선택 안함" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* 날짜 */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-700">날짜</Label>
                <DatePickerInput
                  value={form.watch(`items.${index}.transactedAt`)}
                  onChange={(v) =>
                    form.setValue(`items.${index}.transactedAt`, v)
                  }
                />
              </div>

              {/* 메모 */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-700">메모</Label>
                <Textarea
                  placeholder="추가로 남기고 싶은 내용을 입력하세요"
                  rows={2}
                  className="resize-none"
                  {...form.register(`items.${index}.memo`)}
                />
              </div>
            </div>
          );
        })}

        {fields.length < 10 && (
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">내역 추가</span>
          </button>
        )}

        <Button type="submit" className="w-full rounded-xl py-3">
          다음
        </Button>
      </form>
    </div>
  );
}
