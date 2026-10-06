"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ComposerExitDialog } from "@/components/composer/ComposerExitDialog";
import { useComposerBack } from "@/components/composer/use-composer-back";
import { useComposerExitGuard } from "@/components/composer/use-composer-exit-guard";
import { useIdempotentRequestId } from "@/components/composer/use-idempotent-request-id";
import { MultiTransactionFormWrapper } from "@/components/transactions/MultiTransactionFormWrapper";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCreateBatchTransactions } from "@/hooks/use-transaction";
import { getKstToday } from "@/lib/date";
import {
  createTradeDraft,
  selectTradeReturnHref,
  toTradePayload,
} from "@/lib/stock-trades/composer";
import {
  type StockTradeComposerValues,
  stockTradeComposerSchema,
} from "@/schemas/stock-trade-composer";
import {
  MobileStockTradeFunnel,
  STOCK_TRADE_COMPOSER_FUNNEL_ID,
} from "./MobileStockTradeFunnel";

interface StockTradeComposerProps {
  mode: "full" | "daily";
  /** daily 진입 날짜. 모든 거래의 거래일로 미리 채운다. */
  defaultDate?: string;
}

function ComposerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

export function StockTradeComposer({
  mode,
  defaultDate,
}: StockTradeComposerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [viewportKnown, setViewportKnown] = useState(false);
  useEffect(() => setViewportKnown(true), []);
  const { userId, isLoading: userLoading } = useCurrentUserId();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const createBatch = useCreateBatchTransactions();
  const getRequestId = useIdempotentRequestId();
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialDate] = useState(() => defaultDate ?? getKstToday());
  const origin =
    mode === "daily"
      ? `/assets/stock/records?date=${initialDate}`
      : "/assets/stock/transactions";

  const form = useForm<StockTradeComposerValues>({
    resolver: zodResolver(stockTradeComposerSchema),
    defaultValues: { items: [] },
  });
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const [initialized, setInitialized] = useState(false);
  const loading = userLoading || accountsLoading;
  const firstAccountId = (accounts ?? []).find(
    (account) => account.ownerId === userId,
  )?.id;

  useEffect(() => {
    if (initialized || loading) return;
    form.reset({
      items: [
        createTradeDraft({
          clientId: crypto.randomUUID(),
          date: initialDate,
          accountId: firstAccountId,
        }),
      ],
    });
    setInitialized(true);
  }, [initialized, loading, form, initialDate, firstAccountId]);

  const isMobile = viewportKnown && !isDesktop;
  const { requestExit, leaveAfterSave, exitDialog } = useComposerExitGuard({
    sentinelPrefix: "stock-trade-composer",
    funnelId: STOCK_TRADE_COMPOSER_FUNNEL_ID,
    origin,
    isDirty: form.formState.isDirty,
    isActive: initialized && isMobile,
    getPopFocusTarget: () =>
      document.querySelector<HTMLElement>('[aria-label="수량 1"]'),
  });
  // 데스크톱(태블릿 폭)은 아직 예전 입력이라 헤더 뒤로가기는 바로 나간다.
  useComposerBack(() => requestExit(), viewportKnown && isDesktop);

  const save = async () => {
    if (savingRef.current) return;
    const parsed = stockTradeComposerSchema.safeParse(form.getValues());
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.",
      );
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    try {
      const items = parsed.data.items.map(toTradePayload);
      await createBatch.mutateAsync({
        items,
        requestId: getRequestId(items),
      });
      toast.success(`거래 ${items.length}건이 저장되었습니다.`);
      leaveAfterSave(selectTradeReturnHref({ mode, payloads: items }));
    } catch (error) {
      savingRef.current = false;
      setIsSaving(false);
      toast.error(
        error instanceof Error ? error.message : "거래 저장에 실패했습니다.",
      );
    }
  };

  if (!viewportKnown) return <ComposerSkeleton />;
  if (isDesktop)
    return (
      <MultiTransactionFormWrapper
        mode={mode}
        defaultDate={mode === "daily" ? initialDate : undefined}
      />
    );
  if (!initialized) return <ComposerSkeleton />;

  return (
    <FormProvider {...form}>
      <div className="w-full bg-background text-foreground">
        <MobileStockTradeFunnel
          itemsArray={itemsArray}
          ownerId={userId ?? ""}
          onSave={save}
          isSaving={isSaving}
          onExit={() => requestExit()}
        />
      </div>
      <ComposerExitDialog {...exitDialog} />
    </FormProvider>
  );
}
