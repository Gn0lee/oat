"use client";

import { useFunnel } from "@use-funnel/browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateBatchTransactions } from "@/hooks/use-transaction";
import type { TransactionItemFormData } from "@/schemas/multi-transaction-form";
import type { CreateBatchTransactionInput } from "@/schemas/transaction";
import { AddItemsStep } from "./AddItemsStep";
import { ConfirmStep } from "./ConfirmStep";
import { SelectMetaStep } from "./SelectMetaStep";
import { SelectTypeStep } from "./SelectTypeStep";

// Funnel Context 타입 정의
type TransactionFunnelContext = {
  SelectType: Record<string, never>;
  SelectMeta: {
    type: "buy" | "sell";
  };
  AddItems: {
    type: "buy" | "sell";
    transactedAt: string;
    accountId?: string;
  };
  Confirm: {
    type: "buy" | "sell";
    transactedAt: string;
    accountId?: string;
    items: TransactionItemFormData[];
  };
};

interface TransactionFunnelProps {
  defaultDate: string;
}

export function TransactionFunnel({ defaultDate }: TransactionFunnelProps) {
  const router = useRouter();
  const createBatchTransactions = useCreateBatchTransactions();
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const funnel = useFunnel<TransactionFunnelContext>({
    id: "transaction-funnel",
    initial: {
      step: "SelectType",
      context: {},
    },
  });

  const handleSubmit = async (context: TransactionFunnelContext["Confirm"]) => {
    const validItems = context.items.filter(
      (item) => item.stock && item.quantity && Number(item.quantity) > 0,
    );

    if (validItems.length === 0) {
      toast.error("최소 1개 이상의 거래를 입력해주세요.");
      return;
    }

    const accountId =
      context.accountId === "__none__" ? undefined : context.accountId;

    const input: CreateBatchTransactionInput = {
      type: context.type,
      transactedAt: new Date(context.transactedAt).toISOString(),
      accountId: accountId || undefined,
      items: validItems.map((item) => ({
        ticker: item.stock!.code,
        quantity: Number(item.quantity),
        price: Number(item.price) || 0,
        memo: item.memo || undefined,
        stock: {
          name: item.stock!.name,
          market: item.stock!.market,
          currency:
            item.stock!.market === "US" ? ("USD" as const) : ("KRW" as const),
          assetType: "equity" as const,
        },
      })),
    };

    try {
      await createBatchTransactions.mutateAsync(input);
      const typeText = context.type === "buy" ? "매수" : "매도";
      toast.success(
        `${validItems.length}건의 ${typeText} 거래가 등록되었습니다.`,
      );
      router.push("/assets/stock/transactions");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("거래 등록에 실패했습니다.");
      }
    }
  };

  // 기본 계좌 찾기
  const defaultAccount = accounts.find((a) => a.isDefault);
  const defaultAccountId = defaultAccount?.id;

  return (
    <funnel.Render
      SelectType={({ history }) => (
        <SelectTypeStep
          onSelect={(type) => {
            history.push("SelectMeta", () => ({ type }));
          }}
        />
      )}
      SelectMeta={({ context, history }) => (
        <SelectMetaStep
          type={context.type}
          defaultDate={defaultDate}
          defaultAccountId={defaultAccountId}
          accounts={accounts}
          isLoadingAccounts={isLoadingAccounts}
          onNext={(meta) => {
            history.push("AddItems", (prev) => ({
              ...prev,
              transactedAt: meta.transactedAt,
              accountId: meta.accountId,
            }));
          }}
          onBack={() => history.back()}
        />
      )}
      AddItems={({ context, history }) => (
        <AddItemsStep
          type={context.type}
          onNext={(items) => {
            history.push("Confirm", (prev) => ({
              ...prev,
              items,
            }));
          }}
          onBack={() => history.back()}
        />
      )}
      Confirm={({ context, history }) => (
        <ConfirmStep
          context={context}
          accounts={accounts}
          onSubmit={() => handleSubmit(context)}
          onBack={() => history.back()}
          isSubmitting={createBatchTransactions.isPending}
        />
      )}
    />
  );
}
