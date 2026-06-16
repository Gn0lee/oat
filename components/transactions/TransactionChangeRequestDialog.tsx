"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateRecordChangeRequest } from "@/hooks/use-record-change-requests";
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { formatCurrency } from "@/lib/utils/format";
import type { StockTransactionUpdateProposedChanges } from "@/schemas/record-change-request";

type RequestMode = "update" | "delete";

interface TransactionChangeRequestDialogProps {
  transaction: TransactionWithDetails | null;
  mode: RequestMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const updateRequestFormSchema = z.object({
  quantity: z
    .string()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: "수량은 0보다 커야 합니다.",
    }),
  price: z
    .string()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: "가격은 0 이상이어야 합니다.",
    }),
  transactedAt: z.string().min(1, "거래일을 입력해주세요."),
  accountId: z.string().min(1, "계좌를 선택해주세요."),
  memo: z.string().max(500, "메모는 500자 이내여야 합니다.").optional(),
  message: z.string().max(1000, "메시지는 1000자 이내여야 합니다.").optional(),
});

type UpdateRequestFormValues = z.infer<typeof updateRequestFormSchema>;

function toDateInputValue(value: string) {
  return new Date(value).toISOString().split("T")[0];
}

function toIsoDate(value: string) {
  return new Date(value).toISOString();
}

function buildProposedChanges(
  transaction: TransactionWithDetails,
  values: UpdateRequestFormValues,
): StockTransactionUpdateProposedChanges {
  const changes: StockTransactionUpdateProposedChanges = {};
  const quantity = Number(values.quantity);
  const price = Number(values.price);
  const transactedAt = toIsoDate(values.transactedAt);
  const memo = values.memo || null;

  if (quantity !== transaction.quantity) changes.quantity = quantity;
  if (price !== transaction.price) changes.price = price;
  if (transactedAt !== transaction.transactedAt) {
    changes.transactedAt = transactedAt;
  }
  if (values.accountId !== transaction.accountId) {
    changes.accountId = values.accountId;
  }
  if (memo !== transaction.memo) changes.memo = memo;

  return changes;
}

export function TransactionChangeRequestDialog({
  transaction,
  mode,
  open,
  onOpenChange,
}: TransactionChangeRequestDialogProps) {
  const createMutation = useCreateRecordChangeRequest();
  const form = useForm<UpdateRequestFormValues>({
    resolver: zodResolver(updateRequestFormSchema),
  });

  useEffect(() => {
    if (!transaction || !open) return;

    form.reset({
      quantity: String(transaction.quantity),
      price: String(transaction.price),
      transactedAt: toDateInputValue(transaction.transactedAt),
      accountId: transaction.accountId ?? "",
      memo: transaction.memo ?? "",
      message: "",
    });
  }, [form, transaction, open]);

  if (!transaction) return null;

  const isUpdate = mode === "update";
  const typeLabel = transaction.type === "buy" ? "매수" : "매도";
  const typeVariant = transaction.type === "buy" ? "default" : "secondary";
  const watchTransactedAt = form.watch("transactedAt");

  const handleUpdateSubmit = form.handleSubmit(async (values) => {
    const proposedChanges = buildProposedChanges(transaction, values);

    if (Object.keys(proposedChanges).length === 0) {
      toast.error("변경할 항목을 하나 이상 입력해주세요.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        targetType: "stock_transaction",
        targetId: transaction.id,
        requestType: "update",
        message: values.message?.trim() || undefined,
        proposedChanges,
      });
      toast.success("요청을 보냈습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청 생성에 실패했습니다.",
      );
    }
  });

  const handleDeleteSubmit = async () => {
    const message = form.getValues("message")?.trim();
    if (!message) {
      toast.error("삭제 사유를 입력해주세요.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        targetType: "stock_transaction",
        targetId: transaction.id,
        requestType: "delete",
        message,
        proposedChanges: {},
      });
      toast.success("요청을 보냈습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청 생성에 실패했습니다.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 p-5 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isUpdate && (
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            )}
            {isUpdate ? "거래 수정 요청" : "거래 삭제 요청"}
          </DialogTitle>
          <DialogDescription>
            거래 소유자에게 요청 내용이 전달됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{transaction.stockName}</span>
            <Badge variant={typeVariant}>{typeLabel}</Badge>
          </div>
          <div className="space-y-1 text-muted-foreground text-sm">
            <div className="flex justify-between">
              <span>수량</span>
              <span>{transaction.quantity.toLocaleString()}주</span>
            </div>
            <div className="flex justify-between">
              <span>단가</span>
              <span>
                {formatCurrency(transaction.price, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>소유자</span>
              <span>{transaction.owner.name}</span>
            </div>
          </div>
        </div>

        {isUpdate ? (
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-muted-foreground text-sm">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>종목이나 매수/매도 유형 변경은 삭제 요청으로 처리해주세요.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="request-quantity">수량</Label>
                <Input
                  id="request-quantity"
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="0"
                  {...form.register("quantity")}
                />
                {form.formState.errors.quantity && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.quantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-price">
                  단가 ({transaction.currency === "KRW" ? "원" : "$"})
                </Label>
                <Input
                  id="request-price"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  {...form.register("price")}
                />
                {form.formState.errors.price && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-transacted-at">거래일</Label>
              <DatePickerInput
                id="request-transacted-at"
                value={watchTransactedAt ?? ""}
                onChange={(value) =>
                  form.setValue("transactedAt", value, {
                    shouldValidate: true,
                  })
                }
              />
            </div>

            <AccountSelector
              control={form.control}
              name="accountId"
              variant="inline"
              placeholder="계좌 선택"
              ownerId={transaction.owner.id}
            />

            <div className="space-y-2">
              <Label htmlFor="request-memo">메모</Label>
              <Textarea
                id="request-memo"
                rows={2}
                className="resize-none"
                {...form.register("memo")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-message">요청 메시지 (선택)</Label>
              <Textarea
                id="request-message"
                rows={3}
                className="resize-none"
                placeholder="소유자가 확인할 수 있는 설명을 남겨주세요."
                {...form.register("message")}
              />
            </div>

            <DialogFooter className="mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "요청 중..." : "요청 보내기"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-request-message">삭제 사유</Label>
              <Textarea
                id="delete-request-message"
                rows={3}
                className="resize-none"
                placeholder="삭제가 필요한 이유를 입력해주세요."
                {...form.register("message")}
              />
            </div>

            <DialogFooter className="mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "요청 중..." : "요청 보내기"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
