"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/use-categories";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useCreateBatchLedgerEntries } from "@/hooks/use-ledger-entries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ApiQueryError } from "@/lib/api/client";
import { getKstToday } from "@/lib/date";
import {
  createComposerDraft,
  selectComposerReturnHref,
  toComposerPayload,
} from "@/lib/ledger/composer";
import { safeLedgerReturnTo } from "@/lib/ledger-books/navigation";
import { queries } from "@/lib/queries/keys";
import {
  type LedgerComposerValues,
  ledgerComposerSchema,
} from "@/schemas/ledger-composer";
import { ComposerFormStep } from "./ComposerFormStep";
import { ComposerListStep } from "./ComposerListStep";
import { MobileLedgerEntryFunnel } from "./MobileLedgerEntryFunnel";

interface LedgerEntryComposerProps {
  mode: "full" | "daily";
  defaultDate?: string;
  sourceBookId?: string;
  returnTo?: string;
}

function isValidDate(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
  );
}

export function LedgerEntryComposer({
  mode,
  defaultDate,
  sourceBookId,
  returnTo,
}: LedgerEntryComposerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createBatch = useCreateBatchLedgerEntries();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const {
    data: books = [],
    isPending: booksPending,
    error: booksError,
  } = useLedgerBooks();
  const { data: expenseCategories = [] } = useCategories("expense");
  const { data: incomeCategories = [] } = useCategories("income");
  const requestedBookId = sourceBookId ?? searchParams.get("book") ?? undefined;
  const initialDate = isValidDate(defaultDate)
    ? defaultDate
    : isValidDate(searchParams.get("date"))
      ? (searchParams.get("date") as string)
      : getKstToday();
  const requestedBook = requestedBookId
    ? books.find((book) => book.id === requestedBookId)
    : undefined;
  const defaultBook = books.find(
    (book) =>
      book.isDefault && book.visibility === "shared" && !book.archivedAt,
  );
  const initialBookId = requestedBook?.archivedAt
    ? ""
    : (requestedBook?.id ?? (!requestedBookId ? (defaultBook?.id ?? "") : ""));
  const originFallback =
    mode === "daily"
      ? `/ledger/records${requestedBookId ? `?book=${requestedBookId}&date=${initialDate}` : `?date=${initialDate}`}`
      : "/ledger";
  const safeOrigin = safeLedgerReturnTo(
    returnTo ?? searchParams.get("returnTo"),
    originFallback,
  );
  const form = useForm<LedgerComposerValues>({
    resolver: zodResolver(ledgerComposerSchema),
    defaultValues: { items: [] },
  });
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const initialized = useRef(false);
  const initializedBookId = useRef("");
  const requestRef = useRef<{ signature: string; requestId: string } | null>(
    null,
  );
  const completedRef = useRef<string | null>(null);
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const [invalidContext, setInvalidContext] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const exitFocusRef = useRef<HTMLElement | null>(null);
  dirtyRef.current = form.formState.isDirty;

  useEffect(() => {
    if (initialized.current || booksPending) return;
    initialized.current = true;
    if (
      booksError ||
      !initialBookId ||
      !books.some((book) => book.id === initialBookId && !book.archivedAt)
    ) {
      setInvalidContext(Boolean(requestedBookId));
      return;
    }
    initializedBookId.current = initialBookId;
    form.reset({
      items: [
        createComposerDraft({
          clientId: crypto.randomUUID(),
          bookId: initialBookId,
          date: initialDate,
        }),
      ],
    });
  }, [
    books,
    booksError,
    booksPending,
    form,
    initialBookId,
    initialDate,
    requestedBookId,
  ]);
  const stableInitialBookId = initialized.current
    ? initializedBookId.current
    : initialBookId;

  const exitTask = useCallback(
    (target = safeOrigin, trigger?: HTMLElement | null) => {
      exitFocusRef.current =
        trigger ?? (document.activeElement as HTMLElement | null);
      if (dirtyRef.current) setPendingExit(target);
      else router.push(target);
    },
    [router, safeOrigin],
  );

  useEffect(() => {
    if (!isDesktop) return;
    const handleBack = () => exitTask();
    window.addEventListener("oat:ledger-composer-back", handleBack);
    return () =>
      window.removeEventListener("oat:ledger-composer-back", handleBack);
  }, [exitTask, isDesktop]);

  useEffect(() => {
    const handleClose = (event: Event) =>
      exitTask(
        safeOrigin,
        (event as CustomEvent<{ trigger?: HTMLElement }>).detail?.trigger,
      );
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = new URL(anchor.href, window.location.origin);
      if (
        href.origin !== window.location.origin ||
        completedRef.current ||
        href.pathname === window.location.pathname
      )
        return;
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      exitFocusRef.current = anchor;
      setPendingExit(`${href.pathname}${href.search}${href.hash}`);
    };
    window.addEventListener("oat:ledger-composer-close", handleClose);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("oat:ledger-composer-close", handleClose);
      document.removeEventListener("click", handleClick, true);
    };
  }, [exitTask, safeOrigin]);

  const sentinelRef = useRef<string | null>(null);
  useEffect(() => {
    if (booksPending || invalidContext || !stableInitialBookId) return;
    // Push once per composer mount; StrictMode and dependency changes only rebind the listener.
    if (!sentinelRef.current) {
      sentinelRef.current = `ledger-composer-${crypto.randomUUID()}`;
      window.history.pushState(
        { ...window.history.state, [sentinelRef.current]: true },
        "",
        window.location.href,
      );
    }
    const sentinel = sentinelRef.current;
    const handlePopState = (event: PopStateEvent) => {
      if (completedRef.current) {
        const destination = completedRef.current;
        completedRef.current = null;
        router.replace(destination);
        return;
      }
      if (!event.state?.[sentinel]) {
        if (!dirtyRef.current) return;
        window.history.pushState(
          { ...window.history.state, [sentinel]: true },
          "",
          window.location.href,
        );
        const firstField = document.querySelector<HTMLElement>(
          '[aria-label="내용 1"]',
        );
        exitFocusRef.current = firstField ?? null;
        setPendingExit(safeOrigin);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [booksPending, stableInitialBookId, invalidContext, router, safeOrigin]);

  const save = async () => {
    const values = form.getValues();
    const parsed = ledgerComposerSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.",
      );
      return;
    }
    try {
      const categories = [...expenseCategories, ...incomeCategories];
      const payloads = parsed.data.items.map((item) =>
        toComposerPayload(item, books, categories),
      );
      const signature = JSON.stringify(payloads);
      if (!requestRef.current || requestRef.current.signature !== signature) {
        requestRef.current = { signature, requestId: crypto.randomUUID() };
      }
      const result = await createBatch.mutateAsync({
        entries: payloads,
        requestId: requestRef.current.requestId,
      });
      toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      const target = selectComposerReturnHref({
        sourceBookId: requestedBookId,
        payloads,
      });
      completedRef.current = target;
      const entryCount =
        (
          window.history.state?.["ledger-entry-composer.histories"] as
            | unknown[]
            | undefined
        )?.length ?? 1;
      window.history.go(-(entryCount + 1));
      // If the landing entry is not the pre-composer one, popstate still fires; this covers a missed pop.
      window.setTimeout(() => {
        if (completedRef.current !== target) return;
        completedRef.current = null;
        router.replace(target);
      }, 1000);
    } catch (error) {
      if (
        error instanceof ApiQueryError &&
        ["BOOK_ARCHIVED", "BOOK_UNAVAILABLE", "ENTRY_CHANGED"].includes(
          error.code,
        )
      ) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] }),
          queryClient.invalidateQueries({
            queryKey: queries.ledgerEntries._def,
          }),
        ]);
      }
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    }
  };

  const cancelExit = () => {
    setPendingExit(null);
    requestAnimationFrame(() => exitFocusRef.current?.focus());
  };

  if (booksPending)
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        장부를 불러오는 중...
      </div>
    );
  if (invalidContext)
    return (
      <div className="space-y-3 py-8">
        <p className="font-medium">
          이 장부에서는 새 기록을 추가할 수 없습니다.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(safeOrigin)}
        >
          이전 화면으로
        </Button>
      </div>
    );
  if (!stableInitialBookId)
    return (
      <div className="py-8 text-sm text-muted-foreground">
        사용할 수 있는 활성 장부가 없습니다.
      </div>
    );

  return (
    <FormProvider {...form}>
      <div className="min-h-screen w-full bg-background text-foreground">
        <div hidden={!isDesktop}>
          <ComposerListStep
            itemsArray={itemsArray}
            initialBookId={stableInitialBookId}
            initialDate={initialDate}
            onEditItem={setEditingClientId}
            onSubmit={save}
            isSubmitting={createBatch.isPending}
          />
          <Dialog
            open={Boolean(editingClientId)}
            onOpenChange={(open) => !open && setEditingClientId(null)}
          >
            <DialogContent className="max-h-[95dvh] overflow-y-auto p-0 sm:max-w-xl">
              {editingClientId && (
                <ComposerFormStep
                  key={editingClientId}
                  clientId={editingClientId}
                  onBack={() => setEditingClientId(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
        <div hidden={isDesktop}>
          <MobileLedgerEntryFunnel
            itemsArray={itemsArray}
            active={!isDesktop}
            initialBookId={stableInitialBookId}
            initialDate={initialDate}
            onSave={save}
            isSaving={createBatch.isPending}
            onExit={() => exitTask()}
          />
        </div>
      </div>
      <Dialog
        open={Boolean(pendingExit)}
        onOpenChange={(open) => !open && cancelExit()}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => exitFocusRef.current?.focus());
          }}
        >
          <DialogHeader>
            <DialogTitle>입력 중인 내용을 버릴까요?</DialogTitle>
            <DialogDescription>
              저장하지 않은 내용은 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelExit}>
              계속 입력
            </Button>
            <Button
              type="button"
              onClick={() => {
                const destination = pendingExit ?? safeOrigin;
                setPendingExit(null);
                router.push(destination);
              }}
            >
              내용 버리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
