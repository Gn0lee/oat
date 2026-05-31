"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  useCreateBatchLedgerEntries,
  useCreateLedgerEntry,
} from "@/hooks/use-ledger-entries";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  buildLedgerEntryPayload,
  buildTransferLedgerEntryPayload,
} from "@/lib/api/ledger";
import { ComposerFormStep } from "./ComposerFormStep";
import { ComposerListStep } from "./ComposerListStep";

export type ComposerType = "expense" | "income" | "transfer";

export const ledgerComposerItemSchema = z.object({
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

export const ledgerComposerSchema = z.object({
  defaultType: z.enum(["expense", "income", "transfer"]),
  defaultIsShared: z.boolean(),
  defaultDate: z.string().min(1),
  items: z.array(ledgerComposerItemSchema).min(1),
});

export type LedgerComposerFormValues = z.infer<typeof ledgerComposerSchema>;
export type LedgerComposerItemValues = z.infer<typeof ledgerComposerItemSchema>;

interface LedgerEntryComposerProps {
  mode: "full" | "daily";
  defaultDate: string;
}

export function createDefaultItem({
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

export function LedgerEntryComposer({
  mode,
  defaultDate,
}: LedgerEntryComposerProps) {
  const router = useRouter();
  const createBatch = useCreateBatchLedgerEntries();
  const createSingle = useCreateLedgerEntry();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [editIndex, setEditIndex] = useQueryState("editIndex", parseAsInteger);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editIndex !== null) {
      setActiveEditIndex(editIndex);
      return;
    }

    if (activeEditIndex === null) return;

    const timeoutId = window.setTimeout(() => {
      setActiveEditIndex(null);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [editIndex, activeEditIndex]);

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

  const handleSubmit = async (values: LedgerComposerFormValues) => {
    try {
      const entries = values.items.map((item) =>
        buildLedgerEntryPayload(item.type, item.isShared, item),
      );
      const result = await createBatch.mutateAsync(entries);
      toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      router.push(
        mode === "daily"
          ? `/ledger/records?date=${values.defaultDate}`
          : "/ledger/records",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    }
  };

  const handleTransferSubmit = async (
    transferItem: Parameters<typeof buildTransferLedgerEntryPayload>[1],
  ) => {
    try {
      const defaultIsShared = form.getValues("defaultIsShared");
      await createSingle.mutateAsync(
        buildTransferLedgerEntryPayload(defaultIsShared, transferItem),
      );
      toast.success("1건의 내역이 저장되었습니다.");
      router.push(
        mode === "daily"
          ? `/ledger/records?date=${transferItem.transactedAt}`
          : "/ledger/records",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    }
  };

  return (
    <FormProvider {...form}>
      <div className="w-full h-full">
        <ComposerListStep
          mode={mode}
          onEditItem={(index) => setEditIndex(index)}
          onSubmit={handleSubmit}
          isSubmitting={createBatch.isPending}
          onTransferSubmit={handleTransferSubmit}
          isTransferSubmitting={createSingle.isPending}
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
                <ComposerFormStep
                  key={editIndex}
                  index={editIndex}
                  mode={mode}
                  onBack={() => setEditIndex(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {mounted && !isDesktop && (
        <Drawer
          open={editIndex !== null}
          onOpenChange={(open) => {
            if (!open) setEditIndex(null);
          }}
        >
          {activeEditIndex !== null && (
            <DrawerContent
              className="h-[100dvh] max-h-[100dvh] rounded-none border-t-0 p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-t-0"
              showHandle={false}
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <ComposerFormStep
                key={activeEditIndex}
                index={activeEditIndex}
                mode={mode}
                onBack={() => setEditIndex(null)}
              />
            </DrawerContent>
          )}
        </Drawer>
      )}
    </FormProvider>
  );
}
