"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AddTransferStep } from "@/components/ledger/funnel/AddTransferStep";
import { LedgerMoneySourceCombobox } from "@/components/ledger/LedgerMoneySourceCombobox";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
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
import { useCategories } from "@/hooks/use-categories";
import {
  useCreateBatchLedgerEntries,
  useCreateLedgerEntry,
} from "@/hooks/use-ledger-entries";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import {
  buildLedgerEntryPayload,
  buildTransferLedgerEntryPayload,
} from "@/lib/api/ledger";
import { getLedgerMoneySourceValue } from "@/lib/ledger/money-source-options";
import type { CategoryType } from "@/types";

type ComposerType = "expense" | "income" | "transfer";

const ledgerComposerItemSchema = z.object({
  type: z.enum(["expense", "income"]),
  isShared: z.boolean(),
  amount: z.string().min(1, "금액을 입력해주세요."),
  title: z.string().min(1, "내용을 입력해주세요."),
  categoryId: z.string().min(1, "카테고리를 선택해주세요."),
  paymentMethodId: z.string().optional(),
  accountId: z.string().optional(),
  transactedAt: z.string().min(1, "날짜를 선택해주세요."),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
});

const ledgerComposerSchema = z.object({
  defaultType: z.enum(["expense", "income", "transfer"]),
  defaultIsShared: z.boolean(),
  defaultDate: z.string().min(1),
  items: z.array(ledgerComposerItemSchema).min(1),
});

type LedgerComposerFormValues = z.infer<typeof ledgerComposerSchema>;
type LedgerComposerItemValues = z.infer<typeof ledgerComposerItemSchema>;

interface LedgerEntryComposerProps {
  mode: "full" | "daily";
  defaultDate: string;
}

function createDefaultItem({
  type,
  isShared,
  date,
}: {
  type: Exclude<ComposerType, "transfer">;
  isShared: boolean;
  date: string;
}): LedgerComposerItemValues {
  return {
    type,
    isShared,
    amount: "",
    title: "",
    categoryId: "",
    paymentMethodId: undefined,
    accountId: undefined,
    transactedAt: date,
    memo: "",
  };
}

function getCategoriesForType(
  type: CategoryType,
  expenseCategories: { id: string; name: string }[],
  incomeCategories: { id: string; name: string }[],
) {
  return type === "expense" ? expenseCategories : incomeCategories;
}

export function LedgerEntryComposer({
  mode,
  defaultDate,
}: LedgerEntryComposerProps) {
  const router = useRouter();
  const createBatch = useCreateBatchLedgerEntries();
  const createSingle = useCreateLedgerEntry();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const form = useForm<LedgerComposerFormValues>({
    resolver: zodResolver(ledgerComposerSchema),
    defaultValues: {
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate,
      items: [
        createDefaultItem({
          type: "expense",
          isShared: true,
          date: defaultDate,
        }),
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const defaultType = useWatch({ control: form.control, name: "defaultType" });
  const defaultIsShared = useWatch({
    control: form.control,
    name: "defaultIsShared",
  });
  const currentDefaultDate = useWatch({
    control: form.control,
    name: "defaultDate",
  });

  const handleAddItem = () => {
    if (defaultType === "transfer") return;
    append(
      createDefaultItem({
        type: defaultType,
        isShared: defaultIsShared,
        date: currentDefaultDate,
      }),
    );
  };

  const handleDefaultDateChange = (value: string) => {
    form.setValue("defaultDate", value, { shouldValidate: true });
    if (mode === "daily") {
      fields.forEach((_, index) => {
        form.setValue(`items.${index}.transactedAt`, value, {
          shouldValidate: true,
        });
      });
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const entries = values.items.map((item) =>
        buildLedgerEntryPayload(item.type, item.isShared, item),
      );
      const result = await createBatch.mutateAsync(entries);
      toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      router.push("/ledger/records");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    }
  });

  const handleTransferSubmit = async (
    transferItem: Parameters<typeof buildTransferLedgerEntryPayload>[1],
  ) => {
    try {
      await createSingle.mutateAsync(
        buildTransferLedgerEntryPayload(defaultIsShared, transferItem),
      );
      toast.success("1건의 내역이 저장되었습니다.");
      router.push("/ledger/records");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">유형</Label>
            <Select
              value={defaultType}
              onValueChange={(value) => {
                form.setValue("defaultType", value as ComposerType);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">지출</SelectItem>
                <SelectItem value="income">수입</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-gray-700">공개범위</Label>
            <Select
              value={defaultIsShared ? "shared" : "private"}
              onValueChange={(value) =>
                form.setValue("defaultIsShared", value === "shared")
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">공용</SelectItem>
                <SelectItem value="private">개인</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <Label className="text-sm text-gray-700">
            {mode === "daily" ? "선택한 날짜" : "기본 날짜"}
          </Label>
          <DatePickerInput
            value={currentDefaultDate}
            onChange={handleDefaultDateChange}
            className="h-10"
          />
        </div>
      </div>

      {defaultType === "transfer" ? (
        <AddTransferStep
          defaultDate={currentDefaultDate}
          submitLabel={
            createSingle.isPending ? "저장 중..." : "이체 기록 저장하기"
          }
          onNext={handleTransferSubmit}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {fields.map((field, index) => {
              const itemType = form.watch(`items.${index}.type`);
              const categories = getCategoriesForType(
                itemType,
                expenseCategories,
                incomeCategories,
              );
              const errors = form.formState.errors.items?.[index];
              const moneySourceValue = getLedgerMoneySourceValue({
                paymentMethodId: form.watch(`items.${index}.paymentMethodId`),
                accountId: form.watch(`items.${index}.accountId`),
              });

              const handleMoneySourceChange = (value: string) => {
                if (value.startsWith("pm:")) {
                  form.setValue(
                    `items.${index}.paymentMethodId`,
                    value.slice(3),
                  );
                  form.setValue(`items.${index}.accountId`, undefined);
                  return;
                }
                if (value.startsWith("acc:")) {
                  form.setValue(`items.${index}.accountId`, value.slice(4));
                  form.setValue(`items.${index}.paymentMethodId`, undefined);
                  return;
                }
                form.setValue(`items.${index}.paymentMethodId`, undefined);
                form.setValue(`items.${index}.accountId`, undefined);
              };

              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      내역 {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="size-8 text-gray-400 hover:text-red-500"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select
                      value={form.watch(`items.${index}.type`)}
                      onValueChange={(value) => {
                        form.setValue(
                          `items.${index}.type`,
                          value as "expense" | "income",
                        );
                        form.setValue(`items.${index}.categoryId`, "");
                        form.setValue(
                          `items.${index}.paymentMethodId`,
                          undefined,
                        );
                        form.setValue(`items.${index}.accountId`, undefined);
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">지출</SelectItem>
                        <SelectItem value="income">수입</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={
                        form.watch(`items.${index}.isShared`)
                          ? "shared"
                          : "private"
                      }
                      onValueChange={(value) =>
                        form.setValue(
                          `items.${index}.isShared`,
                          value === "shared",
                        )
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">공용</SelectItem>
                        <SelectItem value="private">개인</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700">내용 *</Label>
                      <Input
                        placeholder="예: 점심, 커피"
                        {...form.register(`items.${index}.title`)}
                      />
                      {errors?.title && (
                        <p className="text-xs text-red-500">
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700">금액 *</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        className="text-right"
                        {...form.register(`items.${index}.amount`)}
                      />
                      {errors?.amount && (
                        <p className="text-xs text-red-500">
                          {errors.amount.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700">
                        카테고리 *
                      </Label>
                      <Select
                        value={form.watch(`items.${index}.categoryId`)}
                        onValueChange={(value) =>
                          form.setValue(`items.${index}.categoryId`, value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors?.categoryId && (
                        <p className="text-xs text-red-500">
                          {errors.categoryId.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700">
                        {itemType === "expense" ? "결제 방법" : "입금 계좌"}
                      </Label>
                      <LedgerMoneySourceCombobox
                        mode={itemType}
                        value={moneySourceValue}
                        paymentMethods={paymentMethods}
                        accounts={accounts}
                        placeholder="선택 안함"
                        onValueChange={handleMoneySourceChange}
                      />
                    </div>
                  </div>

                  {mode === "full" && (
                    <div className="mt-3 space-y-1">
                      <Label className="text-sm text-gray-700">날짜</Label>
                      <DatePickerInput
                        value={form.watch(`items.${index}.transactedAt`)}
                        onChange={(value) =>
                          form.setValue(`items.${index}.transactedAt`, value, {
                            shouldValidate: true,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
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
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="h-12 w-full rounded-xl border-dashed"
          >
            <PlusIcon className="size-4" />
            내역 추가
          </Button>

          <Button
            type="submit"
            disabled={createBatch.isPending}
            className="h-12 w-full rounded-xl"
          >
            {createBatch.isPending
              ? "저장 중..."
              : `${fields.length}건 저장하기`}
          </Button>
        </form>
      )}
    </div>
  );
}
