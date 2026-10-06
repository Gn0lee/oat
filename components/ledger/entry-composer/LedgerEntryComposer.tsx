"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ComposerEditDialog } from "@/components/composer/ComposerEditDialog";
import { ComposerExitDialog } from "@/components/composer/ComposerExitDialog";
import { useComposerBack } from "@/components/composer/use-composer-back";
import { useComposerExitGuard } from "@/components/composer/use-composer-exit-guard";
import { useIdempotentRequestId } from "@/components/composer/use-idempotent-request-id";
import { Button } from "@/components/ui/button";
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
import {
  LEDGER_COMPOSER_FUNNEL_ID,
  MobileLedgerEntryFunnel,
} from "./MobileLedgerEntryFunnel";

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
  const [invalidContext, setInvalidContext] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const getRequestId = useIdempotentRequestId();

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

  const { requestExit, leaveAfterSave, exitDialog } = useComposerExitGuard({
    sentinelPrefix: "ledger-composer",
    funnelId: LEDGER_COMPOSER_FUNNEL_ID,
    origin: safeOrigin,
    isDirty: form.formState.isDirty,
    isActive: !booksPending && !invalidContext && Boolean(stableInitialBookId),
    getPopFocusTarget: () =>
      document.querySelector<HTMLElement>('[aria-label="내용 1"]'),
  });
  useComposerBack(() => requestExit(), isDesktop);

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
      const result = await createBatch.mutateAsync({
        entries: payloads,
        requestId: getRequestId(payloads),
      });
      toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      const target = selectComposerReturnHref({
        sourceBookId: requestedBookId,
        payloads,
      });
      leaveAfterSave(target);
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
      <div className="w-full bg-background text-foreground">
        <div hidden={!isDesktop}>
          <ComposerListStep
            itemsArray={itemsArray}
            initialBookId={stableInitialBookId}
            initialDate={initialDate}
            onEditItem={setEditingClientId}
            onSubmit={save}
            isSubmitting={createBatch.isPending}
          />
          <ComposerEditDialog
            open={Boolean(editingClientId)}
            onClose={() => setEditingClientId(null)}
          >
            {editingClientId && (
              <ComposerFormStep
                key={editingClientId}
                clientId={editingClientId}
                onBack={() => setEditingClientId(null)}
              />
            )}
          </ComposerEditDialog>
        </div>
        <div hidden={isDesktop}>
          <MobileLedgerEntryFunnel
            itemsArray={itemsArray}
            active={!isDesktop}
            initialBookId={stableInitialBookId}
            initialDate={initialDate}
            onSave={save}
            isSaving={createBatch.isPending}
            onExit={() => requestExit()}
          />
        </div>
      </div>
      <ComposerExitDialog {...exitDialog} />
    </FormProvider>
  );
}
