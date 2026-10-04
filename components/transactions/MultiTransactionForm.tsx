"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { StockComposerFormStep } from "@/components/transactions/StockComposerFormStep";
import { StockComposerListStep } from "@/components/transactions/StockComposerListStep";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCreateBatchTransactions } from "@/hooks/use-transaction";
import {
  type MultiTransactionFormData,
  multiTransactionFormSchema,
  type TransactionItemFormData,
} from "@/schemas/multi-transaction-form";
import type { CreateBatchTransactionInput } from "@/schemas/transaction";

interface MultiTransactionFormProps {
  mode?: "full" | "daily";
  defaultDate?: string;
  defaultAccountId?: string;
  ownerId: string;
}

export function MultiTransactionForm({
  mode = "full",
  defaultDate,
  defaultAccountId,
  ownerId,
}: MultiTransactionFormProps) {
  const router = useRouter();
  const createBatchTransactions = useCreateBatchTransactions();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<MultiTransactionFormData>({
    resolver: zodResolver(multiTransactionFormSchema),
    defaultValues: {
      type: "buy",
      transactedAt: defaultDate ?? "",
      accountId: defaultAccountId ?? "",
      items: [],
    },
  });

  const [editIndex, setEditIndex] = useQueryState("editIndex", parseAsInteger);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submitting = useRef(false);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const pendingOpen = useRef<Promise<URLSearchParams> | null>(null);
  const editSnapshot = useRef<{
    index: number;
    item: TransactionItemFormData;
    type: MultiTransactionFormData["type"];
    isNew: boolean;
  } | null>(null);

  const cancelEdit = useCallback(() => {
    const snapshot = editSnapshot.current;
    if (!snapshot) return;
    editSnapshot.current = null;
    if (snapshot.isNew) {
      form.setValue(
        "items",
        form.getValues("items").filter((_, index) => index !== snapshot.index),
      );
    } else {
      form.setValue(`items.${snapshot.index}`, snapshot.item);
    }
    form.setValue("type", snapshot.type);
    form.clearErrors(`items.${snapshot.index}`);
  }, [form]);

  const handleEditItem = (index: number, isNew = false) => {
    editorTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    editSnapshot.current = {
      index,
      item: structuredClone(form.getValues(`items.${index}`)),
      type: form.getValues("type"),
      isNew,
    };
    setEditorSession((session) => session + 1);
    pendingOpen.current = setEditIndex(index, { history: "push" });
  };

  const closeEditor = () => {
    const opening = pendingOpen.current;
    pendingOpen.current = null;
    if (opening) {
      // Wait for nuqs to flush the new history entry before leaving it.
      void opening.then(() => window.history.back());
    } else {
      void setEditIndex(null);
    }
  };

  const handleCancel = () => {
    cancelEdit();
    closeEditor();
  };

  const handleConfirm = () => {
    const index = editSnapshot.current?.index ?? activeEditIndex;
    if (index === null) return;
    const item = form.getValues(`items.${index}`);
    if (!form.getValues("accountId") && item?.accountId) {
      form.setValue("accountId", item.accountId);
    }
    editSnapshot.current = null;
    closeEditor();
  };

  useEffect(() => {
    setMounted(true);
    if (!defaultDate) {
      import("@/lib/date").then(({ getKstToday }) => {
        form.setValue("transactedAt", getKstToday());
      });
    }
  }, [defaultDate, form]);

  useEffect(() => {
    if (editIndex !== null) {
      const item = form.getValues(`items.${editIndex}`);
      if (!item) {
        void setEditIndex(null);
        return;
      }
      editSnapshot.current ??= {
        index: editIndex,
        item: structuredClone(item),
        type: form.getValues("type"),
        isNew: false,
      };
      setActiveEditIndex(editIndex);
      return;
    }

    if (activeEditIndex === null || editSnapshot.current !== null) return;

    const timeoutId = window.setTimeout(() => {
      setActiveEditIndex(null);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [editIndex, activeEditIndex, form, setEditIndex]);

  useEffect(() => {
    const handlePopState = () => {
      if (new URLSearchParams(window.location.search).has("editIndex")) return;
      pendingOpen.current = null;
      cancelEdit();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [cancelEdit]);

  const transformToApiInput = (
    data: MultiTransactionFormData,
  ): CreateBatchTransactionInput => {
    return {
      type: data.type,
      transactedAt: new Date(data.transactedAt).toISOString(),
      accountId: data.accountId,
      items: data.items.map((item) => {
        const itemTransactedAt = item.transactedAt
          ? item.transactedAt.includes("T")
            ? item.transactedAt
            : new Date(item.transactedAt).toISOString()
          : new Date(data.transactedAt).toISOString();

        return {
          ticker: item.stock!.code,
          quantity: Number(item.quantity),
          price: Number(item.price),
          memo: item.memo || undefined,
          transactedAt: itemTransactedAt,
          accountId: item.accountId || data.accountId,
          stock: {
            name: item.stock!.name,
            market: item.stock!.market,
            currency:
              item.stock!.market === "US" ? ("USD" as const) : ("KRW" as const),
            assetType: "equity" as const,
          },
        };
      }),
    };
  };

  const onSubmit = async (data: MultiTransactionFormData) => {
    if (submitting.current) return;
    submitting.current = true;

    try {
      const apiInput = transformToApiInput(data);
      await createBatchTransactions.mutateAsync(apiInput);
      setHasSubmitted(true);
      const typeText = data.type === "buy" ? "매수" : "매도";
      toast.success(
        `${data.items.length}건의 ${typeText} 거래가 등록되었습니다.`,
      );
      router.push(
        mode === "daily"
          ? `/assets/stock/records?date=${data.transactedAt}`
          : "/assets/stock/transactions",
      );
    } catch (error) {
      submitting.current = false;
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
          mode={mode}
          ownerId={ownerId}
          onEditItem={handleEditItem}
          onSubmit={(data) => onSubmit(data)}
          isSubmitting={createBatchTransactions.isPending || hasSubmitted}
        />
      </div>

      {mounted &&
        isDesktop &&
        createPortal(
          <AnimatePresence>
            {editIndex !== null && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 bg-background flex flex-col lg:left-56 lg:top-14 lg:right-0 lg:bottom-0"
              >
                <StockComposerFormStep
                  key={`${editIndex}-${editorSession}`}
                  index={editIndex}
                  mode={mode}
                  ownerId={ownerId}
                  onBack={handleConfirm}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {mounted && !isDesktop && (
        <Drawer
          open={editIndex !== null || editSnapshot.current !== null}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          {activeEditIndex !== null &&
            form.getValues(`items.${activeEditIndex}`) && (
              <DrawerContent
                className="h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0"
                showHandle={false}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  if (editorTrigger.current?.isConnected) {
                    editorTrigger.current.focus({ preventScroll: true });
                  }
                }}
              >
                <DrawerTitle className="sr-only">주식 거래 입력</DrawerTitle>
                <DrawerDescription className="sr-only">
                  핵심 거래값을 입력한 뒤 나머지 정보와 거래를 확인하세요.
                </DrawerDescription>
                <StockComposerFormStep
                  key={`${activeEditIndex}-${editorSession}`}
                  index={activeEditIndex}
                  mode={mode}
                  ownerId={ownerId}
                  isMobile
                  onBack={handleConfirm}
                  onCancel={handleCancel}
                />
              </DrawerContent>
            )}
        </Drawer>
      )}
    </FormProvider>
  );
}
