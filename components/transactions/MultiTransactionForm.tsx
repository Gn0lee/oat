"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { StockComposerFormStep } from "@/components/transactions/StockComposerFormStep";
import { StockComposerListStep } from "@/components/transactions/StockComposerListStep";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCreateBatchTransactions } from "@/hooks/use-transaction";
import {
  type MultiTransactionFormData,
  multiTransactionFormSchema,
} from "@/schemas/multi-transaction-form";
import type { CreateBatchTransactionInput } from "@/schemas/transaction";

interface MultiTransactionFormProps {
  defaultDate: string;
  defaultAccountId: string;
}

export function MultiTransactionForm({
  defaultDate,
  defaultAccountId,
}: MultiTransactionFormProps) {
  const router = useRouter();
  const createBatchTransactions = useCreateBatchTransactions();

  const form = useForm<MultiTransactionFormData>({
    resolver: zodResolver(multiTransactionFormSchema),
    defaultValues: {
      type: "buy",
      transactedAt: defaultDate,
      accountId: defaultAccountId,
      items: [],
    },
  });

  const [editIndex, setEditIndex] = useQueryState("editIndex", parseAsInteger);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 유효한 항목만 필터링 (종목 선택 + 수량 > 0)
  const getValidItems = (data: MultiTransactionFormData) => {
    return data.items.filter(
      (item) => item.stock && item.quantity && Number(item.quantity) > 0,
    );
  };

  const transformToApiInput = (
    data: MultiTransactionFormData,
  ): CreateBatchTransactionInput => {
    const validItems = getValidItems(data);

    return {
      type: data.type,
      transactedAt: new Date(data.transactedAt).toISOString(),
      accountId: data.accountId,
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
  };

  const onSubmit = async (data: MultiTransactionFormData) => {
    const validItems = getValidItems(data);
    if (validItems.length === 0) {
      toast.error("최소 1개 이상의 거래를 입력해주세요.");
      return;
    }

    try {
      const apiInput = transformToApiInput(data);
      await createBatchTransactions.mutateAsync(apiInput);
      const typeText = data.type === "buy" ? "매수" : "매도";
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

  return (
    <FormProvider {...form}>
      <div className="w-full h-full">
        <StockComposerListStep
          onEditItem={(index) => setEditIndex(index)}
          onSubmit={(data) => onSubmit(data)}
          isSubmitting={createBatchTransactions.isPending}
        />
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {editIndex !== null && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 bg-white flex flex-col lg:left-56 lg:top-14 lg:right-0 lg:bottom-0"
              >
                <StockComposerFormStep
                  key={editIndex}
                  index={editIndex}
                  onBack={() => setEditIndex(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </FormProvider>
  );
}
